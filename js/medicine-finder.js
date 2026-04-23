/**
 * medicine-finder.js — Generic Medicine Finder for MediScan
 * Uses Groq AI to find generic alternatives to brand-name medicines.
 */

const CONFIG = window.CONFIG || {};
const API_URL = CONFIG.API_URL || 'https://mediscan-gf5j.onrender.com';

const input      = document.getElementById('medicineInput');
const searchBtn  = document.getElementById('searchBtn');
const resultsEl  = document.getElementById('medicineResults');

// ─── Camera & image scan ───────────────────────────────────────────────────
const openCameraBtn  = document.getElementById('openCameraBtn');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const imageFileInput = document.getElementById('imageFileInput');
const scanPreview    = document.getElementById('scanPreview');
const scanPreviewImg = document.getElementById('scanPreviewImg');
const scanOverlay    = document.getElementById('scanOverlay');
const clearScanBtn   = document.getElementById('clearScanBtn');

if (!openCameraBtn || !uploadImageBtn || !imageFileInput) {
  console.error('[MediScan] Scan elements not found in DOM');
}

// Upload image
if (uploadImageBtn) {
  uploadImageBtn.addEventListener('click', () => imageFileInput.click());
}
if (imageFileInput) {
  imageFileInput.addEventListener('change', () => {
    const file = imageFileInput.files[0];
    if (file) processImageFile(file);
    imageFileInput.value = '';
  });
}

// Camera
if (openCameraBtn) openCameraBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const modal  = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:300;display:flex;align-items:center;justify-content:center;padding:1rem';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:1.25rem;max-width:440px;width:100%">
        <p style="font-weight:700;font-size:1rem;margin-bottom:0.75rem;color:#111827">Point camera at medicine packaging</p>
        <video autoplay playsinline style="width:100%;border-radius:10px;background:#000;display:block;max-height:300px;object-fit:cover"></video>
        <p style="font-size:0.75rem;color:#6B7280;margin:0.5rem 0 0.875rem;text-align:center">Make sure the medicine name is clearly visible</p>
        <div style="display:flex;gap:0.75rem;justify-content:center">
          <button class="btn btn-primary" id="captureBtn" type="button">📸 Capture</button>
          <button class="btn btn-ghost" id="closeCamBtn" type="button">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const video = modal.querySelector('video');
    video.srcObject = stream;

    modal.querySelector('#closeCamBtn').addEventListener('click', () => {
      stream.getTracks().forEach(t => t.stop());
      modal.remove();
    });

    modal.querySelector('#captureBtn').addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      modal.remove();
      canvas.toBlob(blob => {
        processImageFile(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    });
  } catch {
    alert('Could not access camera. Please check permissions or use "Upload Image" instead.');
  }
});

// Clear scan
if (clearScanBtn) {
  clearScanBtn.addEventListener('click', () => {
    scanPreview.hidden = true;
    scanPreviewImg.src = '';
  });
}

// Process image — show preview then OCR
async function processImageFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    scanPreviewImg.src = dataUrl;
    scanPreview.hidden = false;
    scanOverlay.hidden = false;
    const overlayText = scanOverlay.querySelector('p');
    if (overlayText) overlayText.textContent = 'Reading medicine name… (may take a moment)';

    try {
      const base64 = dataUrl.split(',')[1];
      const medicineName = await ocrMedicineName(base64, file.type);
      scanOverlay.hidden = true;

      if (medicineName) {
        input.value = medicineName;
        // Scroll to results and search
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        await search();
      } else {
        showError('Could not read a medicine name from the image. Please try a clearer photo or type the name manually.');
      }
    } catch (err) {
      scanOverlay.hidden = true;
      showError('Scan failed: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

// OCR via server
async function ocrMedicineName(base64, mimeType) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
  try {
    const res = await fetch(`${API_URL}/api/ocr`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ image: base64, mimeType }),
      signal:  controller.signal,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'OCR failed');
    return data.medicineName || null;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Server took too long to respond. It may be waking up — please try again in a moment.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

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
  const res  = await fetch(`${API_URL}/api/medicine`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ medicineName }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Server error');
  return data.result;
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
            ${data.dosageForm ? `<span class="badge badge-neutral">${escHtml(data.dosageForm)}</span>` : ''}
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
          <p style="font-size:0.75rem;color:var(--color-muted);margin-top:0.875rem">
            ⚠️ Prices are AI-estimated based on general market knowledge and may not reflect current pharmacy prices. Always verify with your local pharmacist.
          </p>
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
