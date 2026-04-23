/**
 * symptoms.js — Interactive symptom checker for MediScan.
 */

import { renderStepIndicator } from './nav.js';
import { saveData } from './utils.js';

// ─── Step indicator ────────────────────────────────────────────────────────
renderStepIndicator('#step-indicator', ['Select Symptoms', 'Review', 'Results'], 1);

// ─── State ─────────────────────────────────────────────────────────────────
const selectedAreas    = new Set();
const selectedSymptoms = new Set();
const analyzeBtn       = document.getElementById('analyzeBtn');

// ─── Body region names ─────────────────────────────────────────────────────
const areaNames = {
  'head':       'Head',
  'chest':      'Chest',
  'abdomen':    'Abdomen',
  'left-arm':   'Left Arm',
  'right-arm':  'Right Arm',
  'left-leg':   'Left Leg',
  'right-leg':  'Right Leg',
};

// ─── Body region click ─────────────────────────────────────────────────────
document.querySelectorAll('.body-region').forEach(btn => {
  btn.addEventListener('click', () => {
    const area = btn.dataset.area;
    if (selectedAreas.has(area)) {
      selectedAreas.delete(area);
      btn.classList.remove('body-region--selected');
    } else {
      selectedAreas.add(area);
      btn.classList.add('body-region--selected');
    }
    renderSelectedAreas();
    updateAnalyzeBtn();
  });
});

function renderSelectedAreas() {
  const container = document.getElementById('selectedAreas');
  if (selectedAreas.size === 0) {
    container.innerHTML = '<p class="selected-areas__empty">No areas selected yet</p>';
    return;
  }
  container.innerHTML = [...selectedAreas].map(area => `
    <span class="selected-area-tag">
      ${areaNames[area] || area}
      <span class="selected-area-tag__remove" data-area="${area}" role="button" tabindex="0">&times;</span>
    </span>
  `).join('');

  container.querySelectorAll('.selected-area-tag__remove').forEach(el => {
    el.addEventListener('click', () => {
      const area = el.dataset.area;
      selectedAreas.delete(area);
      document.querySelector(`.body-region[data-area="${area}"]`)
        ?.classList.remove('body-region--selected');
      renderSelectedAreas();
      updateAnalyzeBtn();
    });
  });
}

// ─── Symptom chips ─────────────────────────────────────────────────────────
const commonSymptoms = [
  'Headache', 'Fever', 'Fatigue', 'Nausea', 'Dizziness',
  'Cough', 'Shortness of Breath', 'Chest Pain', 'Joint Pain',
  'Muscle Ache', 'Sore Throat', 'Loss of Appetite',
  'Blurred Vision', 'Numbness', 'Swelling',
];

const chipsContainer = document.getElementById('symptomChips');
chipsContainer.innerHTML = commonSymptoms.map(s =>
  `<button class="symptom-chip" type="button" data-symptom="${s}">${s}</button>`
).join('');

chipsContainer.querySelectorAll('.symptom-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const symptom = chip.dataset.symptom;
    if (selectedSymptoms.has(symptom)) {
      selectedSymptoms.delete(symptom);
      chip.classList.remove('symptom-chip--selected');
    } else {
      selectedSymptoms.add(symptom);
      chip.classList.add('symptom-chip--selected');
    }
    updateAnalyzeBtn();
  });
});

// ─── Severity slider ───────────────────────────────────────────────────────
const painSlider = document.getElementById('painLevel');
const painValue  = document.getElementById('painValue');

const painLabels = [
  'No pain', 'Minimal', 'Mild', 'Moderate', 'Moderate',
  'Significant', 'Strong', 'Intense', 'Very Intense', 'Severe', 'Worst Possible',
];

function updateSlider() {
  const val   = parseInt(painSlider.value);
  const color = val <= 3 ? 'var(--color-success)'
              : val <= 6 ? 'var(--color-warning)'
              : 'var(--color-danger)';
  painValue.textContent  = `${val} / 10 — ${painLabels[val]}`;
  painValue.style.color  = color;
  // Update the track fill via CSS custom property
  painSlider.style.setProperty('--fill', `${val * 10}%`);
}

painSlider.addEventListener('input', updateSlider);
updateSlider(); // initialise on load

// ─── Duration segmented control ────────────────────────────────────────────
const durationBtns  = document.querySelectorAll('.duration-btn');
const durationInput = document.getElementById('symptomDuration');

durationBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    durationBtns.forEach(b => b.classList.remove('duration-btn--active'));
    btn.classList.add('duration-btn--active');
    durationInput.value = btn.dataset.val;
  });
});

// ─── Enable/disable analyze button ────────────────────────────────────────
function updateAnalyzeBtn() {
  analyzeBtn.disabled = selectedAreas.size === 0 && selectedSymptoms.size === 0;
}

// ─── Save & navigate ───────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', () => {
  const data = {
    areas:              [...selectedAreas],
    areaNames:          [...selectedAreas].map(a => areaNames[a] || a),
    symptoms:           [...selectedSymptoms],
    duration:           durationInput.value,
    painLevel:          parseInt(painSlider.value),
    otherSymptoms:      document.getElementById('otherSymptoms').value.trim(),
    existingConditions: document.getElementById('existingConditions').value,
  };
  // Save with user scope
  let uid = 'anonymous';
  try { uid = JSON.parse(localStorage.getItem('mediscan_user'))?.id || 'anonymous'; } catch (_) {}
  saveData('symptomData', data);
  saveData(`symptomData_${uid}`, data);
  window.location.href = 'symptom-confirm.html';
});
