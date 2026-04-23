/**
 * medicine-finder.js — Generic Medicine Finder for MediScan
 * Uses Groq AI to find generic alternatives to brand-name medicines.
 */

const CONFIG = window.CONFIG || {};

const input      = document.getElementById('medicineInput');
const searchBtn  = document.getElementById('searchBtn');
const resultsEl  = document.getElementById('medicineResults');

// ─── Quick-search chips ────────────────────────────────────────────────────
document.querySelectorAll('.medicine-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    input.value = chip.dataset.name;
    search();
  });
});

// ─── Search on Enter ───────────────────────────────────────────────────────
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') search();
});
searchBtn.addEventListener('click', search);

// ─── Main search function ──────────────────────────────────────────────────
async function search() {
  const query = input.value.trim();
  if (!query) { input.focus(); return; }

  showLoading(query);

  try {
    const result = await findGenericMedicine(query);
    renderResult(result, query);
  } catch (err) {
    showError(err.message);
  }
}

// ─── Groq API call ─────────────────────────────────────────────────────────
async function findGenericMedicine(medicineName) {
  const key = CONFIG.GROQ_API_KEY;
  if (!key) throw new Error('No API key configured.');

  const prompt = `You are a pharmaceutical expert. The user is asking about the medicine: "${medicineName}".

Return ONLY a valid JSON object (no markdown):
{
  "brandName": "the brand name as entered or corrected",
  "genericName": "the INN/generic name of the active ingredient",
  "activeIngredient": "active ingredient with strength e.g. Paracetamol 500mg",
  "drugClass": "drug class e.g. Analgesic / Antipyretic",
  "uses": ["use 1", "use 2", "use 3"],
  "dosage": "standard adult dosage",
  "sideEffects": ["side effect 1", "side effect 2", "side effect 3"],
  "warnings": ["warning 1", "warning 2"],
  "genericAlternatives": [
    {
      "name": "generic brand name",
      "manufacturer": "manufacturer name",
      "estimatedPrice": "price range in BDT e.g. ৳2–5 per tablet"
    }
  ],
  "savingsNote": "brief note on how much cheaper generics are vs brand",
  "requiresPrescription": true or false,
  "notFound": false
}

If the medicine is completely unknown, return { "notFound": true, "brandName": "${medicineName}" }.
Focus on medicines available in Bangladesh. Include 3-5 generic alternatives if available.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API error: ${err?.error?.message || res.status}`);
  }

  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty response from AI');
  return JSON.parse(raw);
}

// ─── Render result ─────────────────────────────────────────────────────────
function renderResult(data, query) {
  if (data.notFound) {
    resultsEl.innerHTML = `
      <div class="card medicine-not-found">
        <div class="medicine-not-found__icon">🔍</div>
        <h3>Medicine Not Found</h3>
        <p>We couldn't find information for "<strong>${escHtml(query)}</strong>". Try a different spelling or the generic name.</p>
      </div>`;
    return;
  }

  resultsEl.innerHTML = `
    <div class="medicine-result">

      <!-- Overview card -->
      <div class="card-dark medicine-overview">
        <div class="medicine-overview__top">
          <div>
            <p class="medicine-overview__label">Brand Name</p>
            <h2 class="medicine-overview__brand">${escHtml(data.brandName)}</h2>
            <p class="medicine-overview__generic">Generic: <strong>${escHtml(data.genericName)}</strong></p>
          </div>
          <div class="medicine-overview__badges">
            <span class="badge badge-info">${escHtml(data.drugClass)}</span>
            ${data.requiresPrescription
              ? '<span class="badge badge-elevated">Rx Required</span>'
              : '<span class="badge badge-normal">OTC</span>'}
          </div>
        </div>
        <div class="medicine-overview__ingredient">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
          </svg>
          Active Ingredient: <strong>${escHtml(data.activeIngredient)}</strong>
        </div>
        ${data.savingsNote ? `<p class="medicine-overview__savings">💰 ${escHtml(data.savingsNote)}</p>` : ''}
      </div>

      <div class="medicine-grid">

        <!-- Uses -->
        <div class="card medicine-card">
          <h3 class="medicine-card__title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Uses
          </h3>
          <ul class="medicine-list">
            ${(data.uses || []).map(u => `<li>${escHtml(u)}</li>`).join('')}
          </ul>
        </div>

        <!-- Dosage -->
        <div class="card medicine-card">
          <h3 class="medicine-card__title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Standard Dosage
          </h3>
          <p class="medicine-dosage">${escHtml(data.dosage || '—')}</p>
        </div>

        <!-- Side Effects -->
        <div class="card medicine-card">
          <h3 class="medicine-card__title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Common Side Effects
          </h3>
          <ul class="medicine-list medicine-list--warning">
            ${(data.sideEffects || []).map(s => `<li>${escHtml(s)}</li>`).join('')}
          </ul>
        </div>

        <!-- Warnings -->
        <div class="card medicine-card">
          <h3 class="medicine-card__title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Warnings
          </h3>
          <ul class="medicine-list medicine-list--danger">
            ${(data.warnings || []).map(w => `<li>${escHtml(w)}</li>`).join('')}
          </ul>
        </div>

      </div>

      <!-- Generic Alternatives -->
      ${data.genericAlternatives?.length ? `
        <div class="card medicine-alternatives">
          <h3 class="medicine-alternatives__title">
            💊 Generic Alternatives
            <span class="medicine-alternatives__count">${data.genericAlternatives.length} found</span>
          </h3>
          <div class="medicine-alternatives__grid">
            ${data.genericAlternatives.map((alt, i) => `
              <div class="medicine-alt-card ${i === 0 ? 'medicine-alt-card--best' : ''}">
                ${i === 0 ? '<div class="medicine-alt-card__badge">Best Value</div>' : ''}
                <p class="medicine-alt-card__name">${escHtml(alt.name)}</p>
                <p class="medicine-alt-card__mfr">${escHtml(alt.manufacturer)}</p>
                <p class="medicine-alt-card__price">${escHtml(alt.estimatedPrice)}</p>
              </div>`).join('')}
          </div>
        </div>` : ''}

    </div>`;
}

// ─── Loading state ─────────────────────────────────────────────────────────
function showLoading(query) {
  resultsEl.innerHTML = `
    <div class="medicine-loading">
      <div class="medicine-loading__spinner"></div>
      <p>Looking up <strong>${escHtml(query)}</strong>…</p>
    </div>`;
}

function showError(msg) {
  resultsEl.innerHTML = `
    <div class="card medicine-error">
      <p>⚠️ ${escHtml(msg)}</p>
      <p style="font-size:0.8125rem;color:var(--color-muted);margin-top:0.25rem">Please try again.</p>
    </div>`;
}

// ─── Escape HTML ───────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
