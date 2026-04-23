/**
 * ai.js — OCR + Disease Detection pipeline for MediScan
 *
 * Flow: Image → Gemini Vision (OCR + Analysis in one call) → structured JSON
 *
 * Uses Gemini's multimodal capability to directly read the image,
 * skipping the need for a separate Vision API key entirely.
 */

import { saveData, MOCK_ANALYSIS } from './utils.js';

// CONFIG is set by config.js as window.CONFIG — read it safely
const CONFIG = window.CONFIG || {};

// Lazy import db to avoid circular deps
async function getDb() {
  try { return await import('./db.js'); } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// GROQ — Multimodal image analysis (free alternative to Gemini)
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeImageWithGroq(base64Image, mimeType) {
  const key   = CONFIG.GROQ_API_KEY;
  const model = 'meta-llama/llama-4-scout-17b-16e-instruct';
  const mime  = mimeType || 'image/jpeg';
  const dataUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:${mime};base64,${base64Image}`;

  const prompt = `You are an expert medical AI. Carefully read this medical report image and extract all test results.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "summary": "2-3 sentence plain-language summary of the patient's overall health",
  "status": "e.g. Pre-Diabetic Range / All Normal / Elevated Markers / Critical",
  "statusBadge": "badge-normal OR badge-elevated OR badge-prediab OR badge-severe",
  "confidenceScore": 85,
  "metrics": [
    {
      "name": "exact test name from report",
      "value": "numeric value as string",
      "unit": "unit e.g. U/L, mg/dL, %",
      "status": "Normal OR Elevated OR Low OR High OR Critical",
      "badge": "badge-normal OR badge-elevated OR badge-severe",
      "normalRange": "reference range from report e.g. <45",
      "percent": 50
    }
  ],
  "otherResults": [
    {
      "name": "test name",
      "value": "value with unit",
      "badge": "badge-normal OR badge-elevated OR badge-severe",
      "status": "Normal OR Elevated OR Low OR High OR Critical"
    }
  ],
  "diseases": [
    {
      "name": "potential condition name",
      "likelihood": "Low OR Medium OR High",
      "description": "brief 1-2 sentence explanation based on the test results",
      "urgency": "Monitor OR Consult Doctor OR Urgent"
    }
  ],
  "nextSteps": "specific actionable recommendations based on the actual results",
  "specialistType": "type of specialist to consult"
}`;

  console.log('🤖 Calling Groq API with image...');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('❌ Groq API error:', err);
    throw new Error(`Groq API ${res.status}: ${err?.error?.message || 'Unknown error'}`);
  }

  const data = await res.json();
  console.log('✅ Groq raw response:', data);

  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Groq returned empty response');

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Could not parse Groq response as JSON');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GEMINI — Multimodal image analysis
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeImageWithGemini(base64Image, mimeType) {
  // Groq only — no Gemini fallback
  return await analyzeImageWithGroq(base64Image, mimeType);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: analyzeReport
// ═══════════════════════════════════════════════════════════════════════════

export async function analyzeReport(base64Image, mimeType) {
  console.log('🏥 MediScan: Starting report analysis...');

  if (!CONFIG.GROQ_API_KEY) {
    throw new Error('No Groq API key configured. Please add GROQ_API_KEY to your environment variables.');
  }

  try {
    const result = await analyzeImageWithGemini(base64Image, mimeType);
    result.analysisDate = new Date().toISOString();
    result.source = 'ai_analysis';
    console.log('✅ Analysis complete:', result);
    saveData('analysisResult', result);

    // Save to Firestore
    const dbModule = await getDb();
    if (dbModule) {
      const fileName = localStorage.getItem('uploadedFileName') || 'report';
      await dbModule.saveAnalysis(result, fileName);
    }

    return result;

  } catch (err) {
    console.error('❌ Analysis failed:', err.message);
    throw err; // re-throw so upload.js shows the real error
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: analyzeSymptoms
// ═══════════════════════════════════════════════════════════════════════════

export async function analyzeSymptoms(symptoms, bodyAreas, severity, duration, otherSymptoms = '', existingConditions = '') {
  const groqKey  = CONFIG.GROQ_API_KEY;
  const geminiKey = CONFIG.GOOGLE_GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    console.warn('No API key — using local fallback.');
    const mock = generateSymptomResult({ symptoms, painLevel: severity });
    saveData('symptomResult', mock);
    return mock;
  }

  const prompt = `You are a medical AI assistant helping a patient understand their symptoms.

PATIENT REPORT:
- Symptoms: ${symptoms.length ? symptoms.join(', ') : 'Not specified'}
- Affected body areas: ${bodyAreas.length ? bodyAreas.join(', ') : 'Not specified'}
- Severity: ${severity}/10
- Duration: ${duration || 'Not specified'}
- Additional notes: ${otherSymptoms || 'None'}
- Pre-existing conditions: ${existingConditions || 'None'}

Return ONLY a valid JSON object (no markdown):
{
  "urgency": "low OR medium OR high",
  "urgencyTitle": "e.g. ✅ Low Severity — Self-Care May Suffice",
  "urgencyDesc": "1-2 sentence explanation",
  "conditions": [
    {
      "name": "condition name",
      "match": 0-100,
      "description": "2-3 sentence description",
      "recommendations": ["rec 1", "rec 2", "rec 3", "rec 4"]
    }
  ],
  "specialistType": "type of doctor",
  "isUrgent": true OR false
}

Return 2-4 conditions ordered by likelihood. Always recommend professional consultation.`;

  try {
    // Use Groq if available
    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 1024,
          response_format: { type: 'json_object' }
        })
      });

      if (!res.ok) throw new Error(`Groq ${res.status}`);
      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content;
      const result = JSON.parse(raw);
      saveData('symptomResult', result);

      // Save to Firestore
      const dbModule = await getDb();
      if (dbModule) await dbModule.saveSymptomCheck(result, { symptoms, bodyAreas, severity, duration, otherSymptoms, existingConditions });

      return result;
    }

    // Fallback to Gemini
    const model = CONFIG.GOOGLE_GEMINI_MODEL || 'gemini-1.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' }
        })
      }
    );

    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data   = await res.json();
    const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const result = JSON.parse(raw);
    saveData('symptomResult', result);
    return result;

  } catch (err) {
    console.error('Symptom analysis failed:', err);
    const fallback = generateSymptomResult({ symptoms, painLevel: severity });
    saveData('symptomResult', fallback);
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: generateSymptomResult (local fallback)
// ═══════════════════════════════════════════════════════════════════════════

export function generateSymptomResult(data) {
  const painLevel = data?.painLevel || 0;
  const symptoms  = data?.symptoms  || [];
  const hasSevere = symptoms.some(s =>
    ['Chest Pain', 'Shortness of Breath', 'Blurred Vision', 'Numbness'].includes(s)
  );
  const isHigh   = painLevel >= 8 || hasSevere;
  const isMedium = painLevel >= 4 || symptoms.length >= 3;

  return {
    urgency:      isHigh ? 'high' : isMedium ? 'medium' : 'low',
    urgencyTitle: isHigh   ? '⚠️ High Severity — Seek Medical Attention'
                : isMedium ? '⚡ Moderate Severity — Monitor Closely'
                :            '✅ Low Severity — Self-Care May Suffice',
    urgencyDesc: isHigh
      ? 'Your symptoms indicate a potentially serious condition. Seek medical attention promptly.'
      : isMedium
      ? 'Your symptoms warrant attention. Consider scheduling an appointment soon.'
      : 'Your symptoms appear manageable. Monitor and consult a doctor if they persist.',
    conditions: [
      {
        name: 'Viral Infection / Flu', match: 72,
        description: 'Common viral infections cause fatigue, headache, and body aches. Usually resolves in 1–2 weeks.',
        recommendations: ['Rest and stay hydrated', 'Take OTC pain relievers', 'Monitor temperature', 'See a doctor if symptoms worsen'],
      },
      {
        name: 'Tension Headache', match: 58,
        description: 'Caused by stress or poor posture — dull, constant pressure around the head.',
        recommendations: ['Practice stress management', 'Take screen breaks', 'Apply warm compress', 'Consider OTC pain relief'],
      },
    ],
  };
}
