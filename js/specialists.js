/**
 * specialists.js — AI-powered specialist recommendations for MediScan.
 */

import { renderStepIndicator } from './nav.js';
import { loadData, saveData, MOCK_SPECIALISTS } from './utils.js';
import { isLoggedIn } from './auth.js';
import { db, collection, getDocs } from './firebase.js';

// CONFIG is set by config.js as window.CONFIG — read it safely
const CONFIG = window.CONFIG || {};

// ─── Load context from previous analysis ──────────────────────────────────
const _uid = (() => { try { return JSON.parse(localStorage.getItem('mediscan_user'))?.id || 'anonymous'; } catch { return 'anonymous'; } })();

// Read user-scoped data — never show another user's health data
const analysisResult = JSON.parse(localStorage.getItem(`analysisResult_${_uid}`) || 'null');
const symptomResult  = JSON.parse(localStorage.getItem(`symptomResult_${_uid}`)  || 'null');
const symptomData    = JSON.parse(localStorage.getItem(`symptomData_${_uid}`)    || 'null')
                    || JSON.parse(localStorage.getItem('symptomData') || 'null');

// Only show the AI recommendation banner if the user arrived here by clicking
// "Find Specialists" from the analysis or symptom-results page.
const fromFlow     = sessionStorage.getItem('mediscan_from_flow') === '1';
const flowSource   = sessionStorage.getItem('mediscan_flow_source') || 'report'; // 'report' | 'symptoms' | 'merged'
sessionStorage.removeItem('mediscan_from_flow');
sessionStorage.removeItem('mediscan_flow_source');

const hasContext = fromFlow && !!(analysisResult || symptomResult);

// Use only the context relevant to the current flow
// 'symptoms' → ignore old report data
// 'report'   → ignore old symptom data  
// 'merged'   → use both (user did both scan + symptom check)
const activeAnalysis = (flowSource === 'symptoms') ? null : analysisResult;
const activeSymptom  = (flowSource === 'report')   ? null : symptomResult;

// ─── Render step indicator only when coming from a flow ───────────────────
if (hasContext) {
  renderStepIndicator('#step-indicator', ['Upload', 'Analysis', 'Navigator'], 3);
}

const recBanner = document.getElementById('recBanner');

if (!hasContext) {
  recBanner.hidden = true;
} else {
  const specialistType = activeAnalysis?.specialistType
    || activeSymptom?.specialistType
    || 'General Practitioner';
  document.getElementById('recText').textContent =
    `Based on your analysis, we recommend consulting a ${specialistType}.`;
}

// ─── AI Specialist Recommendation ─────────────────────────────────────────
async function getAISpecialistRecommendation() {
  // Skip if user has no analysis/symptom context
  if (!hasContext) return null;

  const key = CONFIG.GROQ_API_KEY;
  if (!key) return null;

  // Build context from available data
  const context = [];
  if (activeAnalysis?.summary)      context.push(`Medical report: ${activeAnalysis.summary}`);
  if (activeAnalysis?.status)       context.push(`Status: ${activeAnalysis.status}`);
  if (activeAnalysis?.diseases?.length) {
    context.push(`Detected conditions: ${activeAnalysis.diseases.map(d => d.name).join(', ')}`);
  }
  if (symptomData?.symptoms?.length) context.push(`Symptoms: ${symptomData.symptoms.join(', ')}`);
  if (symptomData?.painLevel)        context.push(`Pain level: ${symptomData.painLevel}/10`);
  if (activeSymptom?.urgency)        context.push(`Urgency: ${activeSymptom.urgency}`);

  if (!context.length) return null;

  const prompt = `You are a medical AI assistant. Based on the patient's health data, recommend the most suitable medical specialists.

PATIENT HEALTH DATA:
${context.join('\n')}

Return ONLY a valid JSON object:
{
  "recommendation": "1-2 sentence explanation of why these specialists are recommended",
  "primarySpecialist": "Most important specialist type to see first",
  "specialists": [
    {
      "specialty": "Specialty name",
      "reason": "Why this specialist is needed",
      "urgency": "Immediate OR Soon OR Routine",
      "priority": 1
    }
  ]
}

Return 2-4 specialists ordered by priority. Be specific and medically accurate.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 512,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    return JSON.parse(data.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('AI specialist recommendation failed:', err);
    return null;
  }
}

// ─── Fetch doctors from Firestore ─────────────────────────────────────────
async function fetchDoctors() {
  try {
    const snap = await getDocs(collection(db, 'doctors'));
    if (snap.empty) return null; // fall back to mock if collection is empty
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Failed to load doctors from Firestore:', err);
    return null;
  }
}

// ─── Build specialist list based on AI recommendation ─────────────────────
function buildSpecialistList(doctorList, aiRec) {
  let list = [...doctorList];

  // If no AI context, return full list unsorted
  if (!hasContext || !aiRec?.specialists?.length) return list;

  // Get all recommended specialty keywords from AI
  const recommendedSpecialties = [
    aiRec.primarySpecialist,
    ...aiRec.specialists.map(s => s.specialty)
  ].filter(Boolean).map(s => s.toLowerCase());

  // Annotate each doctor
  list = list.map(doc => {
    const docSpecialty = doc.specialty.toLowerCase();
    const matchedSpec = aiRec.specialists.find(s =>
      docSpecialty.includes(s.specialty.toLowerCase()) ||
      s.specialty.toLowerCase().includes(docSpecialty)
    );
    const isPrimary = recommendedSpecialties.some(s =>
      docSpecialty.includes(s) || s.includes(docSpecialty)
    );

    return {
      ...doc,
      isTopMatch: isPrimary,
      aiReason:   matchedSpec?.reason || null,
      urgency:    matchedSpec?.urgency || (isPrimary ? 'Soon' : 'Routine'),
      _relevance: isPrimary ? 1 : 0,
    };
  });

  // Sort: matching specialists first, then the rest
  list.sort((a, b) => b._relevance - a._relevance);

  // If we have matching doctors, only show them; otherwise show everyone
  const matched = list.filter(d => d._relevance > 0);
  return matched.length > 0 ? matched : [...doctorList];

  // Sort: top matches first
  list.sort((a, b) => (b.isTopMatch ? 1 : 0) - (a.isTopMatch ? 1 : 0));

  return list;
}

// ─── Doctor map — avoids JSON-in-attribute quoting bugs ───────────────────
const doctorMap = new Map(); // id → doctor object
let   allSpecialists = []; // full rendered list for search filtering

// ─── Render specialist cards ───────────────────────────────────────────────
function renderSpecialists(specialists) {
  const grid = document.getElementById('specialistGrid');
  allSpecialists = specialists;
  doctorMap.clear();

  if (specialists.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-muted)">
      <p>No specialists found.</p></div>`;
    updateSearchCount(0, 0);
    return;
  }

  specialists.forEach((doc, i) => doctorMap.set(String(i), doc));
  updateSearchCount(specialists.length, specialists.length);
  renderCards(specialists);
}

function renderCards(list) {
  const grid = document.getElementById('specialistGrid');

  grid.innerHTML = list.map((doc, i) => {
    const key = String(allSpecialists.indexOf(doc));
    const urgencyColor = doc.urgency === 'Immediate' ? '#EF4444'
                       : doc.urgency === 'Soon'      ? '#F59E0B' : '#16A34A';
    const urgencyBg   = doc.urgency === 'Immediate' ? '#FEE2E2'
                       : doc.urgency === 'Soon'      ? '#FEF3C7' : '#DCFCE7';

    // Gracefully handle missing optional fields from Firestore
    const distanceStr = doc.distance ? `${doc.distance} away — ` : '';
    const reviewsStr  = doc.reviews  ? `(${doc.reviews} reviews)` : '';

    return `
      <div class="specialist-card">
        ${doc.isTopMatch ? '<div class="specialist-card__top-badge">⭐ AI Recommended</div>' : ''}
        <div class="specialist-card__header">
          <div class="specialist-card__avatar">${initials(doc.name)}</div>
          <div class="specialist-card__info">
            <h3 class="specialist-card__name">${doc.name}</h3>
            <p class="specialist-card__specialty">${doc.specialty}</p>
            <div class="specialist-card__rating">
              <span class="specialist-card__stars">${stars(doc.rating)}</span>
              <span>${doc.rating}</span>
              <span class="specialist-card__reviews">${reviewsStr}</span>
            </div>
          </div>
        </div>
        ${doc.aiReason ? `
          <div style="background:#EFF6FF;border-radius:8px;padding:0.625rem 0.75rem;margin:0.75rem 0;font-size:0.8125rem;color:#1D4ED8">
            <strong>Why recommended:</strong> ${doc.aiReason}
          </div>` : ''}
        <div class="specialist-card__details">
          <div class="specialist-card__detail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            ${distanceStr}${doc.address || 'Address not provided'}
          </div>
          <div class="specialist-card__detail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            ${doc.phone || 'Phone not provided'}
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
          <span style="font-size:0.75rem;font-weight:600;padding:0.25rem 0.625rem;border-radius:999px;background:${urgencyBg};color:${urgencyColor}">
            ${doc.urgency || 'Routine'}
          </span>
        </div>
        <div class="specialist-card__actions">
          <button class="btn btn-primary btn-sm book-btn" data-key="${key}">Book Appointment</button>
          <button class="btn btn-outline btn-sm details-btn" data-key="${key}">Details</button>
        </div>
      </div>`;
  }).join('');

  // Wire buttons using the map — no JSON-in-attribute
  grid.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => bookDoctor(doctorMap.get(btn.dataset.key)));
  });
  grid.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', () => showDetailsModal(doctorMap.get(btn.dataset.key)));
  });
}

// ─── Search bar wiring ─────────────────────────────────────────────────────
function updateSearchCount(shown, total) {
  const el = document.getElementById('searchCount');
  if (!el) return;
  el.textContent = shown === total
    ? `${total} specialist${total !== 1 ? 's' : ''} available`
    : `${shown} of ${total} specialist${total !== 1 ? 's' : ''} shown`;
}

function wireSearch() {
  const input     = document.getElementById('specialistSearch');
  const clearBtn  = document.getElementById('searchClear');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    clearBtn.hidden = !q;

    if (!q) {
      renderCards(allSpecialists);
      updateSearchCount(allSpecialists.length, allSpecialists.length);
      return;
    }

    const filtered = allSpecialists.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.specialty?.toLowerCase().includes(q) ||
      d.address?.toLowerCase().includes(q)
    );
    renderCards(filtered);
    updateSearchCount(filtered.length, allSpecialists.length);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.hidden = true;
    renderCards(allSpecialists);
    updateSearchCount(allSpecialists.length, allSpecialists.length);
    input.focus();
  });
}

// ─── Helper: stars ─────────────────────────────────────────────────────────
function stars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2);
}

// ─── Init: load doctors + AI recommendation then render ───────────────────
async function init() {
  const grid = document.getElementById('specialistGrid');

  // Show loading state
  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-muted)">
      <div style="width:36px;height:36px;border:3px solid #E5E7EB;border-top-color:#2563EB;
                  border-radius:50%;margin:0 auto 1rem;animation:spin 0.8s linear infinite"></div>
      <p>AI is finding the best specialists for you…</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>`;

  // Fetch doctors from Firestore (fall back to mock if unavailable)
  const [firestoreDoctors, aiRec] = await Promise.all([
    fetchDoctors(),
    getAISpecialistRecommendation(),
  ]);

  const doctorList = firestoreDoctors || MOCK_SPECIALISTS;

  // Update banner with AI recommendation (only if banner is visible)
  if (hasContext && aiRec?.recommendation) {
    document.getElementById('recText').textContent = aiRec.recommendation;
  }

  if (doctorList.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-muted)">
      <p>No specialists available at the moment. Please check back later.</p>
    </div>`;
    return;
  }

  // Build and render specialist list
  const specialists = buildSpecialistList(doctorList, aiRec);
  const matchedCount = specialists.filter(d => d._relevance > 0).length;
  const isFiltered = hasContext && aiRec?.specialists?.length && matchedCount > 0 && matchedCount < doctorList.length;
  renderSpecialists(specialists);
  wireSearch();

  // Show "See all doctors" button if we filtered down
  if (isFiltered) {
    const showAllWrap = document.createElement('div');
    showAllWrap.style.cssText = 'text-align:center;margin:-0.5rem 0 1.5rem';
    showAllWrap.innerHTML = `
      <p style="font-size:0.875rem;color:var(--color-muted);margin-bottom:0.5rem">
        Showing ${specialists.length} recommended specialists for your condition
      </p>
      <button class="btn btn-ghost btn-sm" id="showAllDoctors">
        Show all ${doctorList.length} doctors
      </button>`;
    document.getElementById('specialistGrid').insertAdjacentElement('afterend', showAllWrap);
    document.getElementById('showAllDoctors').addEventListener('click', () => {
      renderSpecialists(buildSpecialistList(doctorList, null));
      showAllWrap.remove();
    });
  }
}

init();

// ─── Auth-aware booking ────────────────────────────────────────────────────
function bookDoctor(doc) {
  if (!isLoggedIn()) {
    showLoginPrompt(doc);
    return;
  }
  saveData('selectedDoctor', doc);
  window.location.href = 'schedule.html';
}

function showLoginPrompt(doc) {
  const existing = document.getElementById('loginPromptModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'loginPromptModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:2rem;max-width:400px;width:100%;
                box-shadow:0 20px 40px rgba(0,0,0,0.18);text-align:center;position:relative">
      <div style="width:56px;height:56px;background:#DBEAFE;border-radius:50%;
                  display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
          fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h3 style="font-size:1.125rem;font-weight:700;color:#111827;margin-bottom:0.375rem">Sign in to Book</h3>
      <p style="font-size:0.875rem;color:#6B7280;margin-bottom:0.25rem">You need an account to book with</p>
      <p style="font-size:0.9375rem;font-weight:700;color:#2563EB;margin-bottom:1.5rem">${doc.name}</p>
      <div style="display:flex;flex-direction:column;gap:0.625rem">
        <a href="login.html" style="display:flex;align-items:center;justify-content:center;
           padding:0.75rem;background:#2563EB;color:#fff;border-radius:10px;
           font-weight:600;font-size:0.9375rem;text-decoration:none">Sign In</a>
        <a href="signup.html" style="display:flex;align-items:center;justify-content:center;
           padding:0.75rem;background:transparent;color:#2563EB;border:1.5px solid #2563EB;
           border-radius:10px;font-weight:600;font-size:0.9375rem;text-decoration:none">Create Free Account</a>
        <button id="loginPromptCancel" style="padding:0.625rem;background:none;border:none;
           color:#6B7280;font-size:0.875rem;cursor:pointer;font-family:inherit">Maybe later</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  saveData('selectedDoctor', doc);
  sessionStorage.setItem('mediscan_return_to', window.location.href);
  modal.querySelector('#loginPromptCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function showDetailsModal(doc) {
  const existing = document.getElementById('specialistModal');
  if (existing) existing.remove();

  const reviewsStr = doc.reviews ? `(${doc.reviews} reviews)` : '';
  const distanceStr = doc.distance ? doc.distance : 'N/A';

  const modal = document.createElement('div');
  modal.id = 'specialistModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:2rem;max-width:420px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.15);position:relative">
      <button id="closeModal" style="position:absolute;top:1rem;right:1rem;background:none;border:none;cursor:pointer;font-size:1.25rem;color:#6B7280">✕</button>
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem">
        <div style="width:60px;height:60px;background:#DBEAFE;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#2563EB;font-size:1.25rem;font-weight:700;flex-shrink:0">${initials(doc.name)}</div>
        <div>
          <h3 style="font-size:1.0625rem;font-weight:700;color:#111827;margin-bottom:0.125rem">${doc.name}</h3>
          <p style="font-size:0.8125rem;color:#2563EB;font-weight:600">${doc.specialty}</p>
        </div>
      </div>
      ${doc.aiReason ? `<div style="background:#EFF6FF;border-radius:8px;padding:0.625rem 0.75rem;margin-bottom:1rem;font-size:0.8125rem;color:#1D4ED8"><strong>AI Recommendation:</strong> ${doc.aiReason}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.875rem;color:#374151">
        <div><strong>Rating:</strong> ★ ${doc.rating} ${reviewsStr}</div>
        <div><strong>Distance:</strong> ${distanceStr}</div>
        <div><strong>Address:</strong> ${doc.address || 'Not provided'}</div>
        <div><strong>Phone:</strong> <a href="tel:${doc.phone}" style="color:#2563EB">${doc.phone || 'Not provided'}</a></div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.5rem">
        <button class="btn btn-primary modal-book-btn" style="flex:1;justify-content:center">Book Appointment</button>
        <button id="closeModal2" class="btn btn-outline" style="flex:1;justify-content:center">Close</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.querySelector('#closeModal').addEventListener('click', () => modal.remove());
  modal.querySelector('#closeModal2').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('.modal-book-btn').addEventListener('click', () => { modal.remove(); bookDoctor(doc); });
}

// ─── Contact Care Team ─────────────────────────────────────────────────────
document.querySelector('.help-section .btn-outline')?.addEventListener('click', () => {
  alert('Care Team Contact\n\nPhone: 1-800-MEDISCAN\nEmail: care@mediscan.health\nHours: Mon–Fri, 8am–6pm');
});
