/**
 * upload.js — Multi-file upload for MediScan.
 * Files stack below the upload grid in a fixed-height scrollable list.
 */

import { renderStepIndicator } from './nav.js';
import { fileToDataUrl, saveData, navigateTo } from './utils.js';
import { analyzeReport } from './ai.js';

// ─── Step indicator ────────────────────────────────────────────────────────
renderStepIndicator('#step-indicator', ['Upload', 'Analysis', 'Navigator'], 1);

// ─── DOM refs ──────────────────────────────────────────────────────────────
const uploadZone      = document.getElementById('uploadZone');
const fileInput       = document.getElementById('fileInput');
const browseBtn       = document.getElementById('browseBtn');
const fileList        = document.getElementById('fileList');
const fileListItems   = document.getElementById('fileListItems');
const fileCountEl     = document.getElementById('fileCount');
const clearAllBtn     = document.getElementById('clearAllBtn');
const analyzeBtn      = document.getElementById('analyzeBtn');
const analyzeBtnLabel = document.getElementById('analyzeBtnLabel');
const openCameraBtn   = document.getElementById('openCameraBtn');
const uploadLoading   = document.getElementById('uploadLoading');
const loadingText     = document.getElementById('loadingText');

// ─── State ─────────────────────────────────────────────────────────────────
const files = [];   // { id, file, thumbUrl }
let nextId  = 0;

const VALID_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE    = 10 * 1024 * 1024;

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmt(bytes) {
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function readThumb(file) {
  return new Promise(resolve => {
    if (file.type === 'application/pdf') { resolve(null); return; }
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

// ─── Add files ─────────────────────────────────────────────────────────────
async function addFiles(incoming) {
  const errs = [];

  for (const f of Array.from(incoming)) {
    if (!VALID_TYPES.includes(f.type)) {
      errs.push(`"${f.name}" — unsupported type.`); continue;
    }
    if (f.size > MAX_SIZE) {
      errs.push(`"${f.name}" — exceeds 10 MB.`); continue;
    }
    // Skip duplicates
    if (files.some(e => e.file.name === f.name && e.file.size === f.size)) continue;

    const thumbUrl = await readThumb(f);
    files.push({ id: nextId++, file: f, thumbUrl });
  }

  if (errs.length) showToast(errs.join('\n'));
  fileInput.value = '';
  render();
}

// ─── Remove one ────────────────────────────────────────────────────────────
function removeOne(id) {
  const i = files.findIndex(e => e.id === id);
  if (i !== -1) files.splice(i, 1);
  render();
}

// ─── Clear all ─────────────────────────────────────────────────────────────
function clearAll() {
  files.length = 0;
  fileInput.value = '';
  render();
}

// ─── Render file list ──────────────────────────────────────────────────────
function render() {
  // Toggle list visibility
  fileList.hidden = files.length === 0;

  // Count label
  fileCountEl.textContent = files.length === 1
    ? '1 file selected'
    : `${files.length} files selected`;

  // Analyze button
  analyzeBtn.disabled = files.length === 0;
  analyzeBtnLabel.textContent = files.length <= 1
    ? 'Analyze Report'
    : `Analyze ${files.length} Reports`;

  // Build items HTML
  fileListItems.innerHTML = files.map(({ id, file, thumbUrl }) => {
    const ext = file.type === 'application/pdf' ? 'PDF'
      : file.name.split('.').pop().toUpperCase();

    const thumb = thumbUrl
      ? `<img class="file-item__thumb" src="${thumbUrl}" alt="" />`
      : `<div class="file-item__thumb file-item__thumb--doc">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
             <polyline points="13 2 13 9 20 9"/>
           </svg>
         </div>`;

    return `
      <div class="file-item" data-id="${id}">
        ${thumb}
        <div class="file-item__info">
          <p class="file-item__name" title="${file.name}">${file.name}</p>
          <p class="file-item__meta">${fmt(file.size)} &nbsp;&middot;&nbsp; ${ext}</p>
        </div>
        <button class="file-item__remove" type="button"
                data-id="${id}" aria-label="Remove ${file.name}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  // Wire remove buttons
  fileListItems.querySelectorAll('.file-item__remove').forEach(btn => {
    btn.addEventListener('click', () => removeOne(Number(btn.dataset.id)));
  });
}

// ─── Error toast ───────────────────────────────────────────────────────────
function showToast(msg) {
  document.getElementById('uploadToast')?.remove();
  const t = document.createElement('div');
  t.id = 'uploadToast';
  t.className = 'upload-toast';
  t.textContent = msg;
  document.querySelector('.upload-grid').insertAdjacentElement('afterend', t);
  setTimeout(() => t.remove(), 4000);
}

// ─── Drag & Drop ───────────────────────────────────────────────────────────
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', e => {
  if (!uploadZone.contains(e.relatedTarget))
    uploadZone.classList.remove('drag-over');
});
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
});

// ─── Click / keyboard to browse ───────────────────────────────────────────
browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
uploadZone.addEventListener('click', e => {
  if (browseBtn.contains(e.target)) return;
  fileInput.click();
});
uploadZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) addFiles(fileInput.files);
});

// ─── Clear all ─────────────────────────────────────────────────────────────
clearAllBtn.addEventListener('click', clearAll);

// ─── Camera ───────────────────────────────────────────────────────────────
openCameraBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

    const modal = document.createElement('div');
    modal.className = 'upload-loading active';
    modal.innerHTML = `
      <div class="upload-loading__card" style="max-width:420px;width:100%;padding:1.25rem">
        <p style="font-weight:700;font-size:1rem;margin-bottom:0.75rem;color:var(--color-text)">Camera Capture</p>
        <video autoplay playsinline
          style="width:100%;border-radius:var(--radius-md);background:#000;display:block"></video>
        <p style="font-size:0.75rem;color:var(--color-muted);margin:0.5rem 0 0.75rem;text-align:center">
          Each capture is added to your file list
        </p>
        <div style="display:flex;gap:0.75rem;justify-content:center">
          <button class="btn btn-primary" id="captureBtn" type="button">Capture</button>
          <button class="btn btn-ghost"   id="closeCamBtn" type="button">Close</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const video = modal.querySelector('video');
    video.srcObject = stream;
    let n = 0;

    modal.querySelector('#closeCamBtn').addEventListener('click', () => {
      stream.getTracks().forEach(t => t.stop());
      modal.remove();
    });

    modal.querySelector('#captureBtn').addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        addFiles([new File([blob], `capture-${++n}.jpg`, { type: 'image/jpeg' })]);
      }, 'image/jpeg', 0.9);
    });

  } catch {
    alert('Could not access camera. Please check permissions or upload a file instead.');
  }
});

// ─── Analyze ──────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  if (!files.length) return;

  uploadLoading.classList.add('active');
  loadingText.textContent = files.length > 1
    ? `Analyzing ${files.length} reports…`
    : 'Analyzing your report…';

  try {
    const primary  = files[0].file;
    const allNames = files.map(e => e.file.name).join(', ');
    const dataUrl  = await fileToDataUrl(primary);
    const base64   = dataUrl.split(',')[1];
    saveData('uploadedFileName', allNames);
    saveData('uploadedFileCount', files.length);
    await analyzeReport(base64, primary.type);
    navigateTo('analysis.html');
  } catch (err) {
    console.error('Analysis failed:', err);
    uploadLoading.classList.remove('active');
    alert('Something went wrong during analysis. Please try again.');
  }
});
