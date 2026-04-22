/**
 * utils.js — Shared helpers for MediScan.
 */

// ─── localStorage helpers ──────────────────────────────────────────────────

export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('localStorage save failed:', e);
  }
}

export function loadData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('localStorage load failed:', e);
    return null;
  }
}

export function clearData(key) {
  localStorage.removeItem(key);
}

// ─── File to Base64 ────────────────────────────────────────────────────────

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Return just the base64 part (without data:mime;base64, prefix)
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // full data URL
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Format date ───────────────────────────────────────────────────────────

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(hour, minute) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

// ─── Navigate ──────────────────────────────────────────────────────────────

export function navigateTo(url) {
  window.location.href = url;
}

// ─── Generate confirmation number ─────────────────────────────────────────

export function generateConfirmationNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MS-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── Mock data for demo / testing ─────────────────────────────────────────

export const MOCK_ANALYSIS = {
  summary: 'Your blood work shows slightly elevated glucose levels, indicating a pre-diabetic range. Most other markers are within normal limits. Mild vitamin D deficiency is also noted.',
  status: 'Pre-Diabetic Range',
  statusBadge: 'badge-prediab',
  confidenceScore: 87,
  metrics: [
    { name: 'Fasting Glucose', value: '118', unit: 'mg/dL', status: 'Elevated', badge: 'badge-elevated', normalRange: '70–100 mg/dL', percent: 65 },
    { name: 'HbA1c', value: '6.1', unit: '%', status: 'Pre-Diabetic', badge: 'badge-prediab', normalRange: '< 5.7%', percent: 55 },
    { name: 'Total Cholesterol', value: '195', unit: 'mg/dL', status: 'Normal', badge: 'badge-normal', normalRange: '< 200 mg/dL', percent: 40 },
    { name: 'Vitamin D', value: '22', unit: 'ng/mL', status: 'Low', badge: 'badge-elevated', normalRange: '30–100 ng/mL', percent: 30 },
  ],
  otherResults: [
    { name: 'Hemoglobin', value: '14.2 g/dL', badge: 'badge-normal', status: 'Normal' },
    { name: 'WBC Count', value: '7,500 /µL', badge: 'badge-normal', status: 'Normal' },
    { name: 'Platelet Count', value: '245,000 /µL', badge: 'badge-normal', status: 'Normal' },
    { name: 'TSH', value: '2.4 mIU/L', badge: 'badge-normal', status: 'Normal' },
    { name: 'Creatinine', value: '0.9 mg/dL', badge: 'badge-normal', status: 'Normal' },
    { name: 'LDL Cholesterol', value: '130 mg/dL', badge: 'badge-elevated', status: 'Borderline High' },
  ],
  nextSteps: 'Consider dietary changes to reduce sugar intake. Schedule a follow-up glucose test in 3 months. Start Vitamin D supplementation (1,000–2,000 IU daily). Consult an endocrinologist for a comprehensive metabolic assessment.',
  specialistType: 'Endocrinologist',
  fileName: 'blood_work_2026.pdf',
  analysisDate: new Date().toISOString(),
};

export const MOCK_SYMPTOM_RESULT = {
  primaryAssessment: 'Based on your reported symptoms of persistent fatigue, frequent headaches, and blurred vision over the past 2-3 days with moderate severity, the AI assessment suggests a potential metabolic or neurological pattern that warrants further investigation.',
  conditionBadge: 'badge-elevated',
  conditionLabel: 'Moderate Concern',
  possibleConditions: [
    'Metabolic imbalance (possibly related to blood sugar levels)',
    'Tension-type headache with fatigue',
    'Vitamin deficiency (particularly B12 or Vitamin D)',
    'Stress-related symptoms',
  ],
  isUrgent: false,
  specialists: [
    { name: 'Dr. Sarah Chen', specialty: 'Endocrinologist', rating: 4.9, reviews: 214, distance: '1.2 mi', address: '456 Medical Center Blvd', phone: '(555) 234-5678', image: null },
    { name: 'Dr. James Okafor', specialty: 'Neurologist', rating: 4.8, reviews: 189, distance: '2.5 mi', address: '789 Neuroscience Center', phone: '(555) 345-6789', image: null },
  ],
  selfCare: [
    { title: 'Stay Hydrated', desc: 'Drink at least 8 glasses of water daily to help maintain energy levels.' },
    { title: 'Get Rest', desc: 'Aim for 7-9 hours of quality sleep per night.' },
    { title: 'Healthy Diet', desc: 'Focus on balanced meals with whole grains, lean protein, and vegetables.' },
    { title: 'Track Symptoms', desc: 'Keep a daily log of your symptoms to share with your doctor.' },
  ],
};

export const MOCK_HEALTH_HISTORY = [
  {
    type: 'scan',
    title: 'Blood Work Analysis',
    description: 'Complete blood panel analyzed — pre-diabetic range detected, Vitamin D deficiency noted.',
    date: '2026-04-12T15:30:00Z',
    badge: 'Report Scan',
    badgeColor: 'primary',
    link: 'analysis.html',
  },
  {
    type: 'appointment',
    title: 'Appointment with Dr. Amara Patel',
    description: 'Endocrinologist consultation scheduled at 123 Health Plaza, Suite 200.',
    date: '2026-04-10T10:00:00Z',
    badge: 'Appointment',
    badgeColor: 'success',
    link: 'appointment-confirmed.html',
  },
  {
    type: 'check',
    title: 'AI Symptom Check',
    description: 'Reported fatigue, headache, blurred vision. Assessment: moderate concern — metabolic pattern suggested.',
    date: '2026-04-08T09:15:00Z',
    badge: 'Health Check',
    badgeColor: 'warning',
    link: 'symptom-results.html',
  },
  {
    type: 'scan',
    title: 'Previous Blood Work',
    description: 'Routine annual blood panel — all markers within normal range.',
    date: '2026-01-15T11:00:00Z',
    badge: 'Report Scan',
    badgeColor: 'primary',
    link: null,
  },
];

export const MOCK_SPECIALISTS = [
  {
    id: 1, name: 'Dr. Amara Patel', specialty: 'Hepatologist', rating: 4.9, reviews: 312,
    distance: '0.8 mi', address: '123 Health Plaza, Suite 200', phone: '(555) 123-4567',
    isTopMatch: false,
  },
  {
    id: 2, name: 'Dr. Michael Torres', specialty: 'Gastroenterologist', rating: 4.7, reviews: 245,
    distance: '2.1 mi', address: '456 Medical Center Blvd', phone: '(555) 234-5678',
    isTopMatch: false,
  },
  {
    id: 3, name: 'Dr. Lisa Chang', specialty: 'Endocrinologist', rating: 4.8, reviews: 198,
    distance: '1.5 mi', address: '789 Wellness Ave, Floor 3', phone: '(555) 345-6789',
    isTopMatch: false,
  },
  {
    id: 4, name: 'Dr. Robert Kimani', specialty: 'Internal Medicine', rating: 4.6, reviews: 167,
    distance: '3.2 mi', address: '321 Care Drive, Building B', phone: '(555) 456-7890',
    isTopMatch: false,
  },
  {
    id: 5, name: 'Dr. Sarah Chen', specialty: 'Cardiologist', rating: 4.8, reviews: 289,
    distance: '1.9 mi', address: '567 Heart Center Ave', phone: '(555) 567-8901',
    isTopMatch: false,
  },
  {
    id: 6, name: 'Dr. James Okafor', specialty: 'Neurologist', rating: 4.7, reviews: 201,
    distance: '2.8 mi', address: '890 Neuro Blvd, Suite 5', phone: '(555) 678-9012',
    isTopMatch: false,
  },
  {
    id: 7, name: 'Dr. Priya Sharma', specialty: 'Diabetologist', rating: 4.9, reviews: 334,
    distance: '1.1 mi', address: '234 Diabetes Care Center', phone: '(555) 789-0123',
    isTopMatch: false,
  },
  {
    id: 8, name: 'Dr. Ahmed Hassan', specialty: 'General Practitioner', rating: 4.5, reviews: 412,
    distance: '0.5 mi', address: '12 Family Health Clinic', phone: '(555) 890-1234',
    isTopMatch: false,
  },
];