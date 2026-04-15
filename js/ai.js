/**
 * ai.js — Claude API integration for MediScan.
 * Uses the Anthropic Messages API to analyze medical reports and symptoms.
 */

import { saveData, MOCK_ANALYSIS, MOCK_SYMPTOM_RESULT } from './utils.js';

// ─── Analyze Medical Report ────────────────────────────────────────────────

export async function analyzeReport(fileBase64, mimeType) {
  // If no API key, return mock data for demo
  if (!CONFIG.CLAUDE_API_KEY) {
    console.warn('No API key configured — returning mock analysis data.');
    const mockData = { ...MOCK_ANALYSIS, analysisDate: new Date().toISOString() };
    saveData('analysisResult', mockData);
    return mockData;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CONFIG.CLAUDE_MODEL,
        max_tokens: CONFIG.CLAUDE_MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: fileBase64 },
              },
              {
                type: 'text',
                text: `Analyze this medical report. Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "summary": "string — brief plain-language summary",
  "status": "string — overall status label",
  "statusBadge": "badge-normal|badge-elevated|badge-prediab|badge-severe",
  "confidenceScore": number (0-100),
  "metrics": [
    { "name": "string", "value": "string", "unit": "string", "status": "string", "badge": "badge-normal|badge-elevated|badge-severe", "normalRange": "string", "percent": number (0-100) }
  ],
  "otherResults": [
    { "name": "string", "value": "string", "badge": "badge-normal|badge-elevated|badge-severe", "status": "string" }
  ],
  "nextSteps": "string — recommended next steps",
  "specialistType": "string — recommended specialist type"
}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Try to parse JSON from the response
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code fences
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    result.analysisDate = new Date().toISOString();
    saveData('analysisResult', result);
    return result;
  } catch (err) {
    console.error('AI analysis failed:', err);
    // Fallback to mock data
    const mockData = { ...MOCK_ANALYSIS, analysisDate: new Date().toISOString() };
    saveData('analysisResult', mockData);
    return mockData;
  }
}

// ─── Analyze Symptoms ──────────────────────────────────────────────────────

export async function analyzeSymptoms(symptoms, bodyAreas, severity, duration) {
  // If no API key, return mock data for demo
  if (!CONFIG.CLAUDE_API_KEY) {
    console.warn('No API key configured — returning mock symptom analysis data.');
    const mockData = { ...MOCK_SYMPTOM_RESULT };
    saveData('symptomResult', mockData);
    return mockData;
  }

  try {
    const symptomText = symptoms.join(', ');
    const bodyText = bodyAreas.join(', ');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CONFIG.CLAUDE_MODEL,
        max_tokens: CONFIG.CLAUDE_MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: `A patient reports the following:
- Symptoms: ${symptomText}
- Affected body areas: ${bodyText}
- Severity (1-10): ${severity}/10
- Duration: ${duration}

Analyze these symptoms and return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "primaryAssessment": "string — detailed assessment",
  "conditionBadge": "badge-normal|badge-elevated|badge-severe|badge-urgent",
  "conditionLabel": "string — short label",
  "possibleConditions": ["string"],
  "isUrgent": boolean,
  "specialists": [
    { "name": "string", "specialty": "string", "rating": number, "reviews": number, "distance": "string", "address": "string", "phone": "string" }
  ],
  "selfCare": [
    { "title": "string", "desc": "string" }
  ]
}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    saveData('symptomResult', result);
    return result;
  } catch (err) {
    console.error('Symptom analysis failed:', err);
    const mockData = { ...MOCK_SYMPTOM_RESULT };
    saveData('symptomResult', mockData);
    return mockData;
  }
}

// ─── Generate Symptom Result (synchronous helper for demo) ─────────────────

export function generateSymptomResult(data) {
  const painLevel = data?.painLevel || 0;
  const symptoms = data?.symptoms || [];

  // Determine urgency based on pain level and symptoms
  const hasSevereSymptoms = symptoms.some(s =>
    ['Chest Pain', 'Shortness of Breath', 'Blurred Vision', 'Numbness'].includes(s)
  );
  const isHigh = painLevel >= 8 || hasSevereSymptoms;
  const isMedium = painLevel >= 4 || symptoms.length >= 3;

  const urgency = isHigh ? 'high' : isMedium ? 'medium' : 'low';
  const urgencyTitle = isHigh
    ? '⚠️ High Severity — Seek Medical Attention'
    : isMedium
      ? '⚡ Moderate Severity — Monitor Closely'
      : '✅ Low Severity — Self-Care May Suffice';
  const urgencyDesc = isHigh
    ? 'Your symptoms indicate a potentially serious condition. We strongly recommend seeking medical attention promptly.'
    : isMedium
      ? 'Your symptoms warrant attention. Consider scheduling an appointment with a healthcare provider.'
      : 'Your symptoms appear manageable. Monitor them and consult a doctor if they persist or worsen.';

  return {
    urgency,
    urgencyTitle,
    urgencyDesc,
    conditions: [
      {
        name: 'Viral Infection / Flu',
        match: 72,
        description: 'Common viral infections can cause fatigue, headache, body aches, and mild fever. Usually resolves within 1-2 weeks with rest and hydration.',
        recommendations: [
          'Rest and stay hydrated',
          'Take over-the-counter pain relievers as needed',
          'Monitor temperature regularly',
          'Consult a doctor if symptoms worsen after 3 days',
        ],
      },
      {
        name: 'Tension Headache',
        match: 58,
        description: 'Tension-type headaches are often caused by stress, poor posture, or eye strain. They typically present as a dull, constant pain around the head.',
        recommendations: [
          'Practice stress management techniques',
          'Take regular breaks from screens',
          'Apply warm compress to the neck',
          'Consider over-the-counter pain relief',
        ],
      },
      {
        name: 'Vitamin D Deficiency',
        match: 45,
        description: 'Low Vitamin D levels can cause fatigue, muscle weakness, and general discomfort. Common in people with limited sun exposure.',
        recommendations: [
          'Get blood work to check Vitamin D levels',
          'Consider Vitamin D supplementation',
          'Increase safe sun exposure',
          'Eat Vitamin D rich foods (fatty fish, eggs, fortified milk)',
        ],
      },
    ],
  };
}
