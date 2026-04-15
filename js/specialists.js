/**
 * specialists.js — Render specialist cards with filtering.
 */

import { renderStepIndicator } from './nav.js';
import { loadData, saveData, MOCK_SPECIALISTS } from './utils.js';
import { isLoggedIn } from './auth.js';

// ─── Render step indicator ─────────────────────────────────────────────────
renderStepIndicator('#step-indicator', ['Upload', 'Analysis', 'Navigator'], 3);

// ─── Load data ─────────────────────────────────────────────────────────────
const analysisResult = loadData('analysisResult');
const specialists = loadData('specialistList') || MOCK_SPECIALISTS;

// Update recommendation banner
if (analysisResult?.specialistType) {
  document.getElementById('recText').textContent =
    `Based on your analysis, we recommend consulting a ${analysisResult.specialistType}.`;
}

// ─── Helper: Generate star characters ──────────────────────────────────────
function stars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

// ─── Helper: Get initials ──────────────────────────────────────────────────
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2);
}

// ─── Render specialist cards ───────────────────────────────────────────────
const grid = document.getElementById('specialistGrid');

grid.innerHTML = specialists.map(doc => `
  <div class="specialist-card">
    ${doc.isTopMatch ? '<div class="specialist-card__top-badge">⭐ Top Match for Your Condition</div>' : ''}
    <div class="specialist-card__header">
      <div class="specialist-card__avatar">${initials(doc.name)}</div>
      <div class="specialist-card__info">
        <h3 class="specialist-card__name">${doc.name}</h3>
        <p class="specialist-card__specialty">${doc.specialty}</p>
        <div class="specialist-card__rating">
          <span class="specialist-card__stars">${stars(doc.rating)}</span>
          <span>${doc.rating}</span>
          <span class="specialist-card__reviews">(${doc.reviews} reviews)</span>
        </div>
      </div>
    </div>
    <div class="specialist-card__details">
      <div class="specialist-card__detail">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        ${doc.distance} away — ${doc.address}
      </div>
      <div class="specialist-card__detail">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        ${doc.phone}
      </div>
    </div>
    <div class="specialist-card__actions">
      <button class="btn btn-primary btn-sm book-btn" data-doctor='${JSON.stringify(doc)}'>Book Appointment</button>
      <button class="btn btn-outline btn-sm details-btn" data-doctor='${JSON.stringify(doc)}'>Details</button>
    </div>
  </div>
`).join('');

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

      <!-- Lock icon -->
      <div style="width:56px;height:56px;background:#DBEAFE;border-radius:50%;
                  display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
          fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <h3 style="font-size:1.125rem;font-weight:700;color:#111827;margin-bottom:0.375rem">
        Sign in to Book
      </h3>
      <p style="font-size:0.875rem;color:#6B7280;margin-bottom:0.25rem">
        You need an account to book an appointment with
      </p>
      <p style="font-size:0.9375rem;font-weight:700;color:#2563EB;margin-bottom:1.5rem">
        ${doc.name}
      </p>

      <div style="display:flex;flex-direction:column;gap:0.625rem">
        <a href="login.html" id="loginPromptSignIn"
           style="display:flex;align-items:center;justify-content:center;gap:0.5rem;
                  padding:0.75rem;background:#2563EB;color:#fff;border-radius:10px;
                  font-weight:600;font-size:0.9375rem;text-decoration:none;transition:background 0.2s">
          Sign In
        </a>
        <a href="signup.html" id="loginPromptSignUp"
           style="display:flex;align-items:center;justify-content:center;gap:0.5rem;
                  padding:0.75rem;background:transparent;color:#2563EB;border:1.5px solid #2563EB;
                  border-radius:10px;font-weight:600;font-size:0.9375rem;text-decoration:none;transition:all 0.2s">
          Create Free Account
        </a>
        <button id="loginPromptCancel"
           style="padding:0.625rem;background:none;border:none;color:#6B7280;
                  font-size:0.875rem;cursor:pointer;font-family:inherit">
          Maybe later
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Save the doctor so after login we can go straight to schedule
  saveData('selectedDoctor', doc);
  // Save return URL so login redirects back to specialists
  sessionStorage.setItem('mediscan_return_to', window.location.href);

  // Update login/signup links to carry the return URL
  modal.querySelector('#loginPromptSignIn').href  = `login.html`;
  modal.querySelector('#loginPromptSignUp').href  = `signup.html`;

  modal.querySelector('#loginPromptCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ─── Book Appointment handlers ─────────────────────────────────────────────
document.querySelectorAll('.book-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    bookDoctor(JSON.parse(btn.dataset.doctor));
  });
});

// ─── Details handlers ──────────────────────────────────────────────────────
document.querySelectorAll('.details-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const doc = JSON.parse(btn.dataset.doctor);
    showDetailsModal(doc);
  });
});

function showDetailsModal(doc) {
  const existing = document.getElementById('specialistModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'specialistModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:2rem;max-width:420px;width:100%;box-shadow:0 10px 25px rgba(0,0,0,0.15);position:relative">
      <button id="closeModal" style="position:absolute;top:1rem;right:1rem;background:none;border:none;cursor:pointer;font-size:1.25rem;color:#6B7280" aria-label="Close">✕</button>
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem">
        <div style="width:60px;height:60px;background:#DBEAFE;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#2563EB;font-size:1.25rem;font-weight:700;flex-shrink:0">${doc.name.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
        <div>
          <h3 style="font-size:1.0625rem;font-weight:700;color:#111827;margin-bottom:0.125rem">${doc.name}</h3>
          <p style="font-size:0.8125rem;color:#2563EB;font-weight:600">${doc.specialty}</p>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.875rem;color:#374151">
        <div><strong>Rating:</strong> ★ ${doc.rating} (${doc.reviews} reviews)</div>
        <div><strong>Distance:</strong> ${doc.distance}</div>
        <div><strong>Address:</strong> ${doc.address}</div>
        <div><strong>Phone:</strong> <a href="tel:${doc.phone}" style="color:#2563EB">${doc.phone}</a></div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.5rem">
        <button class="btn btn-primary modal-book-btn" style="flex:1;justify-content:center" data-doctor='${JSON.stringify(doc)}'>Book Appointment</button>
        <button id="closeModal2" class="btn btn-outline" style="flex:1;justify-content:center">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#closeModal').addEventListener('click', () => modal.remove());
  modal.querySelector('#closeModal2').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('.modal-book-btn').addEventListener('click', () => {
    modal.remove();
    bookDoctor(doc);
  });
}

// ─── Contact Care Team handler ─────────────────────────────────────────────
document.querySelector('.help-section .btn-outline')?.addEventListener('click', () => {
  alert('Care Team Contact\n\nPhone: 1-800-MEDISCAN\nEmail: care@mediscan.health\nHours: Mon–Fri, 8am–6pm');
});