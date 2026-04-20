/**
 * ai.js — AI pipeline for MediScan using Google APIs only.
 *
 * Report flow:  Image → Google Vision (OCR) → Gemini (analysis) → JSON
 * Symptom flow: User selections → Gemini (analysis) → JSON
 *
 * Falls back to local mock data when API keys are not configured.
 */

import { saveData, MOCK_ANALYSIS, MOCK_SYMPTOM_RESULT } from './utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE VISION — OCR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extracts text from a medical report image using Google Vision API.
 * DOCUMENT_TEXT_DETECTION preserves table structure, numbers, and units.
 *
 * @param {string} base64 - Base64 image (no data: prefix)
 * @returns {Promise<string>} Raw extracted text
 */
async function ocrWithGoogleVision(base64) {
  const key = CONFIG.GOOGLE_VISION_API_KEY;
  if (!key) throw new Error('GOOGLE_VISION_API_KEY not set');

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints: ['en'] },
        }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Vision API ${res.status}: ${err?.error?.message || 'unknown error'}`);
  }

  const data = await res.json();
  const text = data.responses?.[0]?.fullTextAnnotation?.text || '';
  if (!text) throw new Error('Vision API returned no text — image may be unreadable');
  return text;
}

// ═══════════════════════════════════════════════════════════════════════════
// GEMINI — shared helper
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calls Gemini API with a text prompt and returns parsed JSON.
 * @param {string} prompt
 * @returns {Promise<object>}
 */
async function callGemini(prompt) {
  const key   = CONFIG.GOOGLE_GEMINI_API_KEY;
  const model = CONFIG.GOOGLE_GEMINI_MODEL || 'gemini-1.5-flash';
  if (!key) throw new Error('GOOGLE_GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,       // low temp = consistent, factual output
          maxOutputTokens: 2048,
          responseMimeType: 'application/json', // ask Gemini to return JSON directly
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_MEDICAL',           threshold: 'BLOCK_NONE' },
        ],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini API ${res.status}: ${err?.error?.message || 'unknown error'}`);
  }

  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!raw) throw new Error('Gemini returned empty response');

  // Parse — handle both raw JSON and markdown-fenced responses
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Could not parse Gemini response as JSON');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT ANALYSIS  (Vision OCR → Gemini)
// ═══════════════════════════════════════════════════════════════════════════

export async function analyzeReport(fileBase64, mimeType) {
  console.log('🔍 Starting report analysis...');
  console.log('📊 API Keys configured:', {
    vision: !!CONFIG.GOOGLE_VISION_API_KEY,
    gemini: !!CONFIG.GOOGLE_GEMINI_API_KEY
  });

  // Demo mode — no keys configured
  if (!CONFIG.GOOGLE_VISION_API_KEY && !CONFIG.GOOGLE_GEMINI_API_KEY) {
    console.warn('⚠️ No Google API keys configured — using mock data.');
    const mock = { ...MOCK_ANALYSIS, analysisDate: new Date().toISOString() };
    saveData('analysisResult', mock);
    return mock;
  }

  try {
    // ── Step 1: OCR ────────────────────────────────────────────────────────
    let reportText = '';
    if (CONFIG.GOOGLE_VISION_API_KEY) {
      console.info('🔍 Running Google Vision OCR…');
      console.log('📝 Vision API Key (first 10 chars):', CONFIG.GOOGLE_VISION_API_KEY.substring(0, 10) + '...');
      reportText = await ocrWithGoogleVision(fileBase64);
      console.info(`✅ OCR complete — ${reportText.length} characters extracted`);
      console.log('📄 Extracted text preview:', reportText.substring(0, 200) + '...');
    }

    if (!CONFIG.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not set — cannot analyse report');
    }

    // ── Step 2: Gemini analysis ────────────────────────────────────────────
    console.info('🤖 Running Gemini analysis…');
    console.log('🔑 Gemini API Key (first 10 chars):', CONFIG.GOOGLE_GEMINI_API_KEY.substring(0, 10) + '...');
    const prompt = reportText
      ? `You are a medical report analyst AI. The following text was extracted via OCR from a medical report.

EXTRACTED REPORT TEXT:
---
${reportText}
---

Carefully analyze this medical report. Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "summary": "2-3 sentence plain-language summary of the overall health picture",
  "status": "overall status label e.g. Pre-Diabetic Range / All Normal / Elevated Markers",
  "statusBadge": "badge-normal OR badge-elevated OR badge-prediab OR badge-severe",
  "confidenceScore": 0-100,
  "metrics": [
    {
      "name": "test name",
      "value": "numeric value as string",
      "unit": "unit of measurement",
      "status": "Normal / Elevated / Low / High / Critical",
      "badge": "badge-normal OR badge-elevated OR badge-severe",
      "normalRange": "reference range string",
      "percent": 0-100
    }
  ],
  "otherResults": [
    { "name": "test name", "value": "value string", "badge": "badge-normal OR badge-elevated OR badge-severe", "status": "status string" }
  ],
  "nextSteps": "specific actionable recommendations based on the results",
  "specialistType": "type of specialist to consult if needed"
}`
      : `You are a medical report analyst AI. Analyze this medical report and return ONLY a valid JSON object with this structure:
{
  "summary": "2-3 sentence plain-language summary",
  "status": "overall status label",
  "statusBadge": "badge-normal OR badge-elevated OR badge-prediab OR badge-severe",
  "confidenceScore": 0-100,
  "metrics": [
    { "name": "string", "value": "string", "unit": "string", "status": "string", "badge": "badge-normal OR badge-elevated OR badge-severe", "normalRange": "string", "percent": 0-100 }
  ],
  "otherResults": [
    { "name": "string", "value": "string", "badge": "badge-normal OR badge-elevated OR badge-severe", "status": "string" }
  ],
  "nextSteps": "string",
  "specialistType": "string"
}`;

    const result = await callGemini(prompt);
    result.analysisDate = new Date().toISOString();
    saveData('analysisResult', result);
    return result;

  } catch (err) {
    console.error('Report analysis failed:', err);
    const mock = { ...MOCK_ANALYSIS, analysisDate: new Date().toISOString() };
    saveData('analysisResult', mock);
    return mock;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYMPTOM ANALYSIS  (Gemini text only — no OCR)
// ═══════════════════════════════════════════════════════════════════════════

export async function analyzeSymptoms(symptoms, bodyAreas, severity, duration) {
  if (!CONFIG.GOOGLE_GEMINI_API_KEY) {
    console.warn('No Gemini API key — using mock symptom data.');
    const mock = { ...MOCK_SYMPTOM_RESULT };
    saveData('symptomResult', mock);
    return mock;
  }

  try {
    const prompt = `You are a medical AI assistant helping a patient understand their symptoms.

PATIENT REPORT:
- Symptoms: ${symptoms.length ? symptoms.join(', ') : 'Not specified'}
- Affected body areas: ${bodyAreas.length ? bodyAreas.join(', ') : 'Not specified'}
- Severity: ${severity}/10
- Duration: ${duration || 'Not specified'}

Provide a careful, responsible symptom assessment. Return ONLY a valid JSON object (no markdown, no explanation):
{
  "urgency": "low OR medium OR high",
  "urgencyTitle": "short title e.g. ✅ Low Severity — Self-Care May Suffice",
  "urgencyDesc": "1-2 sentence explanation of urgency level",
  "conditions": [
    {
      "name": "condition name",
      "match": 0-100,
      "description": "2-3 sentence plain-language description",
      "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"]
    }
  ],
  "specialistType": "type of doctor to see if needed",
  "isUrgent": true OR false
}

Return 2-4 possible conditions ordered by likelihood. Always recommend professional medical consultation.`;

    const result = await callGemini(prompt);
    saveData('symptomResult', result);
    return result;

  } catch (err) {
    console.error('Symptom analysis failed:', err);
    const mock = { ...MOCK_SYMPTOM_RESULT };
    saveData('symptomResult', mock);
    return mock;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL DEMO FALLBACK (no API keys required)
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
    urgencyDesc:  isHigh
      ? 'Your symptoms indicate a potentially serious condition. Seek medical attention promptly.'
      : isMedium
      ? 'Your symptoms warrant attention. Consider scheduling an appointment soon.'
      : 'Your symptoms appear manageable. Monitor and consult a doctor if they persist.',
    conditions: [
      {
        name: 'Viral Infection / Flu', match: 72,
        description: 'Common viral infections cause fatigue, headache, body aches, and mild fever. Usually resolves within 1–2 weeks with rest and hydration.',
        recommendations: ['Rest and stay hydrated', 'Take OTC pain relievers as needed', 'Monitor temperature', 'See a doctor if symptoms worsen after 3 days'],
      },
      {
        name: 'Tension Headache', match: 58,
        description: 'Tension headaches are caused by stress, poor posture, or eye strain — presenting as dull, constant pressure around the head.',
        recommendations: ['Practice stress management', 'Take regular screen breaks', 'Apply warm compress to neck', 'Consider OTC pain relief'],
      },
      {
        name: 'Vitamin D Deficiency', match: 45,
        description: 'Low Vitamin D causes fatigue, muscle weakness, and general discomfort — common in people with limited sun exposure.',
        recommendations: ['Get blood work to check Vitamin D', 'Consider supplementation', 'Increase safe sun exposure', 'Eat Vitamin D-rich foods'],
      },
    ],
  };
}
