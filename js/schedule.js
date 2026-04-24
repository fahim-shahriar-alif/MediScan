/**
 * schedule.js — Week-strip calendar + time slot picker for MediScan.
 */

import { renderStepIndicator } from './nav.js';
import { loadData, saveData } from './utils.js';

// ─── Step indicator ────────────────────────────────────────────────────────
renderStepIndicator('#step-indicator', ['Select Specialist', 'Schedule', 'Confirm'], 2);

// ─── Load doctor ───────────────────────────────────────────────────────────
const doctor = loadData('selectedDoctor');

if (doctor) {
  document.getElementById('docName').textContent      = doctor.name;
  document.getElementById('docSpecialty').textContent = doctor.specialty;
  document.getElementById('docAddress').textContent   = doctor.address   || '—';
  document.getElementById('docDistance').textContent  = doctor.distance  ? doctor.distance + ' away' : '—';
  document.getElementById('docPhone').textContent     = doctor.phone     || '—';
  document.getElementById('mapAddress').textContent   = doctor.address   || '—';
  document.getElementById('mapDistance').textContent  = doctor.distance  ? doctor.distance + ' away' : '—';
  document.getElementById('mapPhone').textContent     = doctor.phone     || '—';

  // Wire Get Directions button
  const directionsBtn = document.getElementById('directionsBtn');
  if (directionsBtn && doctor.address) {
    const query = encodeURIComponent(doctor.address + ', Bangladesh');
    directionsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  }

  // Star rating
  const stars = '★'.repeat(Math.floor(doctor.rating)) + (doctor.rating % 1 >= 0.5 ? '½' : '');
  document.getElementById('docRating').innerHTML =
    `<span class="sched-stars">${stars}</span>
     <span class="sched-rating-val">${doctor.rating}</span>
     <span class="sched-rating-count">(${doctor.reviews} reviews)</span>`;

  // ── Leaflet map — geocode the doctor's address ──────────────────────────
  initMap(doctor.address, doctor.name);

} else {
  document.getElementById('docName').textContent      = 'No doctor selected';
  document.getElementById('docSpecialty').textContent = 'Please go back and select a specialist';
  document.getElementById('reviewBtn').disabled       = true;
  // Show default Dhaka map
  initMap('Dhaka, Bangladesh', 'Clinic');
}

// ─── Leaflet map initializer ───────────────────────────────────────────────
async function initMap(address, label) {
  const mapEl = document.getElementById('leafletMap');
  if (!mapEl || typeof L === 'undefined') return;

  // Default to Dhaka center while geocoding
  const defaultLat = 23.8103, defaultLng = 90.4125;

  const map = L.map('leafletMap', {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
  }).setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Custom marker icon
  const markerIcon = L.divIcon({
    html: `<div style="
      width:32px;height:32px;background:#2563EB;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);border:3px solid #fff;
      box-shadow:0 2px 8px rgba(37,99,235,0.5)">
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    className: '',
  });

  // Geocode address using Nominatim (free OpenStreetMap geocoder)
  if (address && address !== '—') {
    try {
      const query = encodeURIComponent(address + ', Bangladesh');
      const res   = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'MediScan/1.0' } }
      );
      const data = await res.json();

      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        map.setView([lat, lng], 15);
        L.marker([lat, lng], { icon: markerIcon })
          .addTo(map)
          .bindPopup(`<strong>${label}</strong><br>${address}`)
          .openPopup();
      } else {
        // Geocoding failed — show Dhaka with a note
        L.marker([defaultLat, defaultLng], { icon: markerIcon })
          .addTo(map)
          .bindPopup(`<strong>${label}</strong><br>${address}`)
          .openPopup();
      }
    } catch {
      // Network error — map still shows, just without precise location
      L.marker([defaultLat, defaultLng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`<strong>${label}</strong><br>${address}`)
        .openPopup();
    }
  }
}

// ─── State ─────────────────────────────────────────────────────────────────
const today       = new Date(); today.setHours(0,0,0,0);
let   weekStart   = new Date(today);                    // Monday of current week
let   selectedDate = null;
let   selectedSlot = null;   // { hour, minute, label }

// Align weekStart to Monday
const dow = weekStart.getDay();
weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));

// Simulated booked slots (hour:minute strings)
const BOOKED = new Set(['8:30','10:00','13:00','16:00','18:00','15:30']);

// ─── Helpers ───────────────────────────────────────────────────────────────
const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MON_NAMES  = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

function fmtTime(h, m) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh   = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
}

function fmtShortDate(d) {
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}

// ─── Week-strip calendar ───────────────────────────────────────────────────
function renderWeek() {
  // Month label — show month(s) covered by this week
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  const monthLabel = weekStart.getMonth() === endOfWeek.getMonth()
    ? `${MON_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${MON_NAMES[weekStart.getMonth()]} / ${MON_NAMES[endOfWeek.getMonth()]} ${weekStart.getFullYear()}`;
  document.getElementById('weekMonth').textContent = monthLabel;

  const container = document.getElementById('weekDays');
  container.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    d.setHours(0,0,0,0);

    const isPast     = d < today;
    const isToday    = d.getTime() === today.getTime();
    const isSelected = selectedDate && d.getTime() === selectedDate.getTime();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'week-day'
      + (isPast     ? ' week-day--past'     : '')
      + (isToday    ? ' week-day--today'    : '')
      + (isSelected ? ' week-day--selected' : '');
    btn.disabled = isPast;
    btn.innerHTML = `
      <span class="week-day__name">${DAY_NAMES[d.getDay()]}</span>
      <span class="week-day__num">${d.getDate()}</span>
      ${isToday ? '<span class="week-day__today-dot">Today</span>' : ''}`;

    btn.addEventListener('click', () => {
      selectedDate = new Date(d);
      renderWeek();
      updateReadyCard();
      updateConfirmBtn();
    });

    container.appendChild(btn);
  }
}

document.getElementById('prevWeek').addEventListener('click', () => {
  weekStart.setDate(weekStart.getDate() - 7);
  renderWeek();
});
document.getElementById('nextWeek').addEventListener('click', () => {
  weekStart.setDate(weekStart.getDate() + 7);
  renderWeek();
});

renderWeek();

// ─── Time slots ────────────────────────────────────────────────────────────
const SLOTS = {
  morning:   [{h:8,m:0},{h:8,m:30},{h:9,m:0},{h:9,m:30},{h:10,m:0},{h:10,m:30},
              {h:11,m:0},{h:11,m:30}],
  afternoon: [{h:12,m:0},{h:12,m:30},{h:13,m:0},{h:13,m:30},{h:14,m:0},{h:14,m:30},
              {h:15,m:0},{h:15,m:30},{h:16,m:0}],
  evening:   [{h:16,m:30},{h:17,m:0},{h:17,m:30},{h:18,m:0},{h:18,m:30},
              {h:19,m:0},{h:19,m:30},{h:20,m:0},{h:20,m:30}],
};

function renderSlots(containerId, slots) {
  const container = document.getElementById(containerId);
  container.innerHTML = slots.map(({ h, m }) => {
    const key    = `${h}:${m}`;
    const label  = fmtTime(h, m);
    const booked = BOOKED.has(key);
    const isSel  = selectedSlot && selectedSlot.hour === h && selectedSlot.minute === m;

    return `<button class="time-slot${booked ? ' time-slot--booked' : ''}${isSel ? ' time-slot--selected' : ''}"
              type="button" data-h="${h}" data-m="${m}"
              ${booked ? 'disabled aria-label="' + label + ' — unavailable"' : ''}>
              ${label}
            </button>`;
  }).join('');

  container.querySelectorAll('.time-slot:not(.time-slot--booked)').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSlot = { hour: +btn.dataset.h, minute: +btn.dataset.m,
                       label: fmtTime(+btn.dataset.h, +btn.dataset.m) };
      // Re-render all slot groups to update selection
      renderSlots('morningSlots',   SLOTS.morning);
      renderSlots('afternoonSlots', SLOTS.afternoon);
      renderSlots('eveningSlots',   SLOTS.evening);
      updateReadyCard();
      updateConfirmBtn();
    });
  });
}

renderSlots('morningSlots',   SLOTS.morning);
renderSlots('afternoonSlots', SLOTS.afternoon);
renderSlots('eveningSlots',   SLOTS.evening);

// ─── Ready to Book card ────────────────────────────────────────────────────
function updateReadyCard() {
  const card = document.getElementById('readyCard');
  if (selectedDate && selectedSlot) {
    card.hidden = false;
    document.getElementById('readyDate').textContent = fmtShortDate(selectedDate);
    document.getElementById('readyTime').textContent = selectedSlot.label;
  } else {
    card.hidden = true;
  }
}

// ─── Confirm button → open review modal ───────────────────────────────────
const reviewBtn = document.getElementById('reviewBtn');

function updateConfirmBtn() {
  reviewBtn.disabled = !(selectedDate && selectedSlot);
}

reviewBtn.addEventListener('click', () => {
  if (!selectedDate || !selectedSlot) return;

  const appt = {
    doctor:    doctor || { name: 'Doctor', specialty: 'Specialist', address: '—', phone: '—', distance: '—' },
    date:      selectedDate.toISOString(),
    time:      selectedSlot.hour,
    timeLabel: selectedSlot.label,
  };
  saveData('appointmentDetails', appt);
  showReviewModal(appt);
});

// ─── Review modal ──────────────────────────────────────────────────────────
function showReviewModal(appt) {
  const doc = appt.doctor;
  const initials = doc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const dateStr = new Date(appt.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doc.address)}`;

  // Remove any existing modal
  document.getElementById('reviewModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'reviewModal';
  overlay.className = 'review-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'reviewModalTitle');

  overlay.innerHTML = `
    <div class="review-modal">

      <!-- Header -->
      <div class="review-modal__header">
        <h2 class="review-modal__title" id="reviewModalTitle">Review Your Appointment</h2>
        <p class="review-modal__subtitle">Please confirm the details below</p>
        <button class="review-modal__close" id="reviewModalClose" type="button" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Doctor row -->
      <div class="review-modal__doctor">
        <div class="review-modal__avatar">${initials}</div>
        <div class="review-modal__doc-info">
          <h3 class="review-modal__doc-name">${doc.name}</h3>
          <p class="review-modal__doc-specialty">${doc.specialty}</p>
          <span class="badge badge-normal" style="margin-top:0.25rem">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Verified Provider
          </span>
        </div>
      </div>

      <hr class="review-modal__divider" />

      <!-- Details -->
      <div class="review-modal__details">

        <div class="review-modal__row">
          <div class="review-modal__row-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div>
            <p class="review-modal__row-label">Location</p>
            <p class="review-modal__row-value">${doc.address}</p>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
               class="review-modal__row-link">View Directions</a>
          </div>
        </div>

        <div class="review-modal__row">
          <div class="review-modal__row-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p class="review-modal__row-label">Date &amp; Time</p>
            <p class="review-modal__row-value">${dateStr} at ${appt.timeLabel}</p>
          </div>
        </div>

        <div class="review-modal__row">
          <div class="review-modal__row-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
          </div>
          <div>
            <p class="review-modal__row-label">Arrival</p>
            <p class="review-modal__row-value">Please arrive 15 minutes before your appointment</p>
          </div>
        </div>

      </div>

      <!-- Actions -->
      <div class="review-modal__actions">
        <button class="btn btn-ghost" id="reviewModalEdit" type="button">
          Edit Details
        </button>
        <button class="btn btn-primary btn-lg review-modal__confirm" id="reviewModalConfirm" type="button">
          Confirm &amp; Book Appointment
        </button>
      </div>

    </div>`;

  document.body.appendChild(overlay);

  // Trap focus on open
  overlay.querySelector('#reviewModalConfirm').focus();

  // Close handlers
  const close = () => {
    overlay.classList.add('review-modal-overlay--out');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  };

  overlay.querySelector('#reviewModalClose').addEventListener('click', close);
  overlay.querySelector('#reviewModalEdit').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });

  // Confirm → save confirmation number and navigate
  overlay.querySelector('#reviewModalConfirm').addEventListener('click', () => {
    const { generateConfirmationNumber, saveData: sd } = window._scheduleUtils || {};
    // Use inline generation since we can't import here easily
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let num = 'MS-';
    for (let i = 0; i < 8; i++) num += chars[Math.floor(Math.random() * chars.length)];
    saveData('confirmationNumber', num);
    window.location.href = 'appointment-confirmed.html';
  });
}
