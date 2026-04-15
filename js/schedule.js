/**
 * schedule.js — Calendar and time slot picker for MediScan.
 */

import { loadData, saveData, formatTime } from './utils.js';

// ─── Load doctor data ──────────────────────────────────────────────────────
const doctor = loadData('selectedDoctor');
if (doctor) {
  const initials = doctor.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  document.getElementById('docAvatar').textContent = initials;
  document.getElementById('docName').textContent = doctor.name;
  document.getElementById('docSpecialty').textContent = doctor.specialty;
  document.getElementById('docRating').innerHTML =
    `<span style="color:var(--color-warning)">★</span> ${doctor.rating} (${doctor.reviews} reviews)`;
  document.getElementById('clinicAddress').textContent = doctor.address;
} else {
  // No doctor selected — show fallback and redirect hint
  document.getElementById('docName').textContent = 'No doctor selected';
  document.getElementById('docSpecialty').textContent = 'Please go back and select a specialist';
  document.getElementById('reviewBtn').disabled = true;
}

// ─── State ─────────────────────────────────────────────────────────────────
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let selectedTime = null;

const reviewBtn = document.getElementById('reviewBtn');

// ─── Calendar rendering ────────────────────────────────────────────────────
function renderCalendar() {
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  document.getElementById('calendarMonth').textContent =
    `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';
  // Empty cells for days before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="cal-day cal-day--empty"></div>';
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    date.setHours(0, 0, 0, 0);
    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();
    const isSelected = selectedDate &&
      selectedDate.getDate() === d &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear;

    let classes = 'cal-day';
    if (isPast) classes += ' cal-day--past';
    if (isToday) classes += ' cal-day--today';
    if (isSelected) classes += ' cal-day--selected';

    html += `<div class="${classes}" data-day="${d}">${d}</div>`;
  }

  document.getElementById('calendarDays').innerHTML = html;

  // Day click handlers
  document.querySelectorAll('.cal-day:not(.cal-day--empty):not(.cal-day--past)')
    .forEach(el => {
      el.addEventListener('click', () => {
        selectedDate = new Date(currentYear, currentMonth, parseInt(el.dataset.day));
        renderCalendar();
        updateReviewBtn();
      });
    });
}

document.getElementById('prevMonth').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});

renderCalendar();

// ─── Time slots rendering ──────────────────────────────────────────────────
function renderTimeSlots(containerId, hours) {
  const container = document.getElementById(containerId);
  container.innerHTML = hours.map(h => {
    const time = formatTime(h, 0);
    return `<button class="time-slot" type="button" data-hour="${h}">${time}</button>`;
  }).join('');

  container.querySelectorAll('.time-slot').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('time-slot--selected'));
      btn.classList.add('time-slot--selected');
      selectedTime = parseInt(btn.dataset.hour);
      updateReviewBtn();
    });
  });
}

renderTimeSlots('morningSlots', [8, 9, 10, 11]);
renderTimeSlots('afternoonSlots', [13, 14, 15, 16]);
renderTimeSlots('eveningSlots', [17, 18, 19]);

// ─── Update review button ──────────────────────────────────────────────────
function updateReviewBtn() {
  reviewBtn.disabled = !(selectedDate && selectedTime !== null);
}

// ─── Review button → save & navigate ───────────────────────────────────────
reviewBtn.addEventListener('click', () => {
  if (!selectedDate || selectedTime === null) return;
  saveData('appointmentDetails', {
    doctor: doctor || { name: 'Doctor', specialty: 'Specialist', address: '—', phone: '—' },
    date: selectedDate.toISOString(),
    time: selectedTime,
    timeLabel: formatTime(selectedTime, 0),
  });
  window.location.href = 'appointment-review.html';
});