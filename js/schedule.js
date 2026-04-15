/**
 * schedule.js — Week-strip calendar + time slot picker for MediScan.
 */

import { renderStepIndicator } from './nav.js';
import { loadData, saveData } from './utils.js';

// ─── Step indicator ────────────────────────────────────────────────────────
renderStepIndicator('#step-indicator', ['Upload', 'Analysis', 'Navigator'], 3);

// ─── Load doctor ───────────────────────────────────────────────────────────
const doctor = loadData('selectedDoctor');

if (doctor) {
  document.getElementById('docName').textContent      = doctor.name;
  document.getElementById('docSpecialty').textContent = doctor.specialty;
  document.getElementById('docAddress').textContent   = doctor.address;
  document.getElementById('docDistance').textContent  = doctor.distance + ' away';
  document.getElementById('docPhone').textContent     = doctor.phone;
  document.getElementById('mapAddress').textContent   = doctor.address;
  document.getElementById('mapDistance').textContent  = doctor.distance + ' away';
  document.getElementById('mapPhone').textContent     = doctor.phone;

  // Star rating
  const stars = '★'.repeat(Math.floor(doctor.rating)) + (doctor.rating % 1 >= 0.5 ? '½' : '');
  document.getElementById('docRating').innerHTML =
    `<span class="sched-stars">${stars}</span>
     <span class="sched-rating-val">${doctor.rating}</span>
     <span class="sched-rating-count">(${doctor.reviews} reviews)</span>`;
} else {
  document.getElementById('docName').textContent      = 'No doctor selected';
  document.getElementById('docSpecialty').textContent = 'Please go back and select a specialist';
  document.getElementById('reviewBtn').disabled       = true;
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

// ─── Confirm button ────────────────────────────────────────────────────────
const reviewBtn = document.getElementById('reviewBtn');

function updateConfirmBtn() {
  reviewBtn.disabled = !(selectedDate && selectedSlot);
}

reviewBtn.addEventListener('click', () => {
  if (!selectedDate || !selectedSlot) return;
  saveData('appointmentDetails', {
    doctor: doctor || { name: 'Doctor', specialty: 'Specialist', address: '—', phone: '—', distance: '—' },
    date:      selectedDate.toISOString(),
    time:      selectedSlot.hour,
    timeLabel: selectedSlot.label,
  });
  window.location.href = 'appointment-review.html';
});
