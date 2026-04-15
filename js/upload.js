/**
 * upload.js — Drag-and-drop file upload for MediScan.
 */

import { renderStepIndicator } from './nav.js';
import { fileToBase64, saveData, navigateTo } from './utils.js';
import { analyzeReport } from './ai.js';

// ─── Render step indicator ─────────────────────────────────────────────────
renderStepIndicator('#step-indicator', ['Upload', 'Analysis', 'Navigator'], 1);

// ─── DOM refs ──────────────────────────────────────────────────────────────
const uploadZone   = document.getElementById('uploadZone');
const fileInput    = document.getElementById('fileInput');
const browseBtn    = document.getElementById('browseBtn');
const filePreview  = document.getElementById('filePreview');
const fileName     = document.getElementById('fileName');
const fileSize     = document.getElementById('fileSize');
const removeFile   = document.getElementById('removeFile');
const analyzeBtn   = document.getElementById('analyzeBtn');
const openCameraBtn = document.getElementById('openCameraBtn');

let selectedFile = null;

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function setFile(file) {
  if (!file) return;

  const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    alert('Please upload a PDF, JPEG, or PNG file.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be under 10 MB.');
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  uploadZone.style.display = 'none';
  filePreview.hidden = false;
  analyzeBtn.disabled = false;
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  uploadZone.style.display = '';
  filePreview.hidden = true;
  analyzeBtn.disabled = true;
}

// ─── Drag & Drop ───────────────────────────────────────────────────────────
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

// ─── Click to browse ──────────────────────────────────────────────────────
browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener('click', (e) => {
  if (e.target === browseBtn) return;
  fileInput.click();
});

uploadZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

// ─── Remove file ──────────────────────────────────────────────────────────
removeFile.addEventListener('click', clearFile);

// ─── Camera ───────────────────────────────────────────────────────────────
openCameraBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    // Create a simple camera modal
    const modal = document.createElement('div');
    modal.className = 'upload-loading active';
    modal.innerHTML = `
      <div class="upload-loading__card" style="padding:1rem;">
        <video autoplay playsinline style="width:100%;max-width:400px;border-radius:12px;"></video>
        <div style="display:flex;gap:0.75rem;margin-top:1rem;justify-content:center;">
          <button class="btn btn-primary" id="captureBtn">Capture</button>
          <button class="btn btn-ghost" id="closeCamBtn">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const video = modal.querySelector('video');
    video.srcObject = stream;

    modal.querySelector('#closeCamBtn').addEventListener('click', () => {
      stream.getTracks().forEach(t => t.stop());
      modal.remove();
    });

    modal.querySelector('#captureBtn').addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setFile(file);
        stream.getTracks().forEach(t => t.stop());
        modal.remove();
      }, 'image/jpeg', 0.9);
    });
  } catch (err) {
    alert('Could not access camera. Please check permissions or upload a file instead.');
  }
});

// ─── Analyze button ──────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  // Show loading overlay
  const overlay = document.createElement('div');
  overlay.className = 'upload-loading active';
  overlay.innerHTML = `
    <div class="upload-loading__card">
      <div class="upload-loading__spinner"></div>
      <p class="upload-loading__text">Analyzing your report…</p>
      <p class="upload-loading__subtext">This may take a few seconds</p>
    </div>
  `;
  document.body.appendChild(overlay);

  try {
    const base64 = await fileToBase64(selectedFile);
    saveData('uploadedFileName', selectedFile.name);
    await analyzeReport(base64, selectedFile.type);
    navigateTo('analysis.html');
  } catch (err) {
    console.error('Analysis failed:', err);
    overlay.remove();
    alert('Something went wrong during analysis. Please try again.');
  }
});