/**
 * ai.js — AI pipeline for MediScan
 * All AI calls go through the Express backend server.
 */

import { saveData, MOCK_ANALYSIS } from './utils.js';

const CONFIG  = window.CONFIG || {};

// Server API base URL — set CONFIG.API_URL in config.js for local dev
const API_URL = CONFIG.API_URL || 'https://mediscan-gf5j.onrender.com';

// Lazy import db
async function getDb() {
  try { return await import('./db.js'); } catch { return null; }
}

// ─── User-scoped data helpers ──────────────────────────────────────────────
function getCurrentUid() {
  try { return JSON.parse(localStorage.getItem('mediscan_user'))?.id || 'anonymous'; }
  catch { return 'anonymous'; }
}

function saveUserData(key, data) {
  const uid = getCurrentUid();
  saveData(`${key}_${uid}`, data);
  saveData(key, data);
}

// ─── Call server API ───────────────────────────────────────────────────────
async function callServer(endpoint, body) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: analyzeReport
// ═══════════════════════════════════════════════════════════════════════════

export async function analyzeReport(base64Image, mimeType) {
  console.log('🏥 MediScan: Sending report to server for analysis...');

  const data   = await callServer('/api/analyze', { image: base64Image, mimeType });
  const result = data.result;
  console.log('✅ Analysis complete:', result);
  saveUserData('analysisResult', result);

  const dbModule = await getDb();
  if (dbModule) {
    const fileName = localStorage.getItem('uploadedFileName') || 'report';
    await dbModule.saveAnalysis(result, fileName);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: analyzeSymptoms
// ═══════════════════════════════════════════════════════════════════════════

export async function analyzeSymptoms(symptoms, bodyAreas, severity, duration, otherSymptoms = '', existingConditions = '') {
  try {
    const data   = await callServer('/api/symptoms', { symptoms, bodyAreas, severity, duration, otherSymptoms, existingConditions });
    const result = data.result;
    saveUserData('symptomResult', result);

    const dbModule = await getDb();
    if (dbModule) await dbModule.saveSymptomCheck(result, { symptoms, bodyAreas, severity, duration, otherSymptoms, existingConditions });

    return result;
  } catch (err) {
    console.error('Symptom analysis failed:', err);
    const fallback = generateSymptomResult({ symptoms, painLevel: severity });
    saveUserData('symptomResult', fallback);
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
        description: 'Common viral infections cause fatigue, headache, and body aches.',
        recommendations: ['Rest and stay hydrated', 'Take OTC pain relievers', 'Monitor temperature', 'See a doctor if symptoms worsen'],
      },
    ],
  };
}
