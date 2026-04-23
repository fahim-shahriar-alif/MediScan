/**
 * MediScan Express Server
 * Proxies AI API calls to Groq — keeps the API key server-side.
 *
 * Endpoints:
 *   POST /api/analyze   — OCR + medical report analysis
 *   POST /api/symptoms  — Symptom analysis
 *   POST /api/chat      — AI health chat
 *   POST /api/medicine  — Generic medicine finder
 *   GET  /api/health    — Health check
 */

import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import fetch   from 'node-fetch';

const app  = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' })); // large for base64 images
app.use(cors({
  origin: [
    'https://mediscanbd.netlify.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3001',
  ],
  methods: ['GET', 'POST'],
}));

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MediScan API', timestamp: new Date().toISOString() });
});

// ─── Helper: call Groq ─────────────────────────────────────────────────────
async function callGroq(messages, options = {}) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured on server.');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:           options.model       || 'llama-3.3-70b-versatile',
      messages,
      temperature:     options.temperature ?? 0.2,
      max_tokens:      options.max_tokens  || 2048,
      response_format: options.json ? { type: 'json_object' } : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq API ${res.status}: ${err?.error?.message || 'Unknown error'}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty response');
  return content;
}

// ─── POST /api/analyze ─────────────────────────────────────────────────────
// Body: { image: base64string, mimeType: string }
app.post('/api/analyze', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ error: 'image is required' });

    const mime    = mimeType || 'image/jpeg';
    const dataUrl = image.startsWith('data:') ? image : `data:${mime};base64,${image}`;

    const prompt = `You are an expert medical AI. Carefully read this medical report image and extract all test results.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "summary": "2-3 sentence plain-language summary of the patient's overall health",
  "status": "e.g. Pre-Diabetic Range / All Normal / Elevated Markers / Critical",
  "statusBadge": "badge-normal OR badge-elevated OR badge-prediab OR badge-severe",
  "confidenceScore": 85,
  "metrics": [{"name":"","value":"","unit":"","status":"","badge":"","normalRange":"","percent":50}],
  "otherResults": [{"name":"","value":"","badge":"","status":""}],
  "diseases": [{"name":"","likelihood":"","description":"","urgency":""}],
  "nextSteps": "specific actionable recommendations",
  "specialistType": "type of specialist to consult"
}`;

    const content = await callGroq([{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }], {
      model:       'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1,
      json:        true,
    });

    const result = JSON.parse(content);
    result.source = 'ai_analysis';
    result.analysisDate = new Date().toISOString();
    res.json({ ok: true, result });

  } catch (err) {
    console.error('[/api/analyze]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/symptoms ────────────────────────────────────────────────────
// Body: { symptoms, bodyAreas, severity, duration, otherSymptoms, existingConditions }
app.post('/api/symptoms', async (req, res) => {
  try {
    const { symptoms = [], bodyAreas = [], severity = 0, duration = '', otherSymptoms = '', existingConditions = '' } = req.body;

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
  "conditions": [{"name":"","match":0,"description":"","recommendations":[]}],
  "specialistType": "type of doctor",
  "isUrgent": false
}

Return 2-4 conditions ordered by likelihood. Always recommend professional consultation.`;

    const content = await callGroq(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, max_tokens: 1024, json: true }
    );

    res.json({ ok: true, result: JSON.parse(content) });

  } catch (err) {
    console.error('[/api/symptoms]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/chat ────────────────────────────────────────────────────────
// Body: { messages: [{role, content}], systemPrompt: string }
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], systemPrompt = '' } = req.body;
    if (!messages.length) return res.status(400).json({ error: 'messages required' });

    const fullMessages = [
      { role: 'system', content: systemPrompt || 'You are MediScan AI, a helpful health assistant. Keep responses concise. Never diagnose.' },
      ...messages.slice(-10),
    ];

    const content = await callGroq(fullMessages, { temperature: 0.5, max_tokens: 400 });
    res.json({ ok: true, reply: content });

  } catch (err) {
    console.error('[/api/chat]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/medicine ────────────────────────────────────────────────────
// Body: { medicineName: string }
app.post('/api/medicine', async (req, res) => {
  try {
    const { medicineName } = req.body;
    if (!medicineName) return res.status(400).json({ error: 'medicineName required' });

    const prompt = `You are a pharmaceutical expert. The user is asking about: "${medicineName}".

Return ONLY a valid JSON object (no markdown):
{
  "brandName": "",
  "genericName": "",
  "activeIngredient": "",
  "drugClass": "",
  "dosageForm": "Tablet/Syrup/Injection/Cream/etc",
  "uses": [],
  "dosage": "",
  "sideEffects": [],
  "warnings": [],
  "genericAlternatives": [{"name":"","manufacturer":"","estimatedPrice":""}],
  "savingsNote": "",
  "requiresPrescription": false,
  "notFound": false
}

Focus on medicines available in Bangladesh. Include 3-5 generic alternatives.`;

    const content = await callGroq(
      [{ role: 'user', content: prompt }],
      { temperature: 0.1, max_tokens: 1024, json: true }
    );

    res.json({ ok: true, result: JSON.parse(content) });

  } catch (err) {
    console.error('[/api/medicine]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/ocr ─────────────────────────────────────────────────────────
// Body: { image: base64, mimeType: string }
app.post('/api/ocr', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ error: 'image required' });

    const mime    = mimeType || 'image/jpeg';
    const dataUrl = image.startsWith('data:') ? image : `data:${mime};base64,${image}`;

    const content = await callGroq([{
      role: 'user',
      content: [
        { type: 'text', text: 'Extract ONLY the primary medicine/brand name from this packaging image. Return JSON: { "medicineName": "name or null" }' },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }], {
      model:       'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1,
      max_tokens:  64,
      json:        true,
    });

    const parsed = JSON.parse(content);
    res.json({ ok: true, medicineName: parsed.medicineName || null });

  } catch (err) {
    console.error('[/api/ocr]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ MediScan API running on port ${PORT}`);
  console.log(`   Groq key: ${GROQ_API_KEY ? '✓ configured' : '✗ MISSING'}`);
});
