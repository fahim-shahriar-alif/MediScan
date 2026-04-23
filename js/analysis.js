/**
 * analysis.js — Render AI analysis results on the analysis page.
 */

import { renderStepIndicator } from './nav.js';
import { loadData, formatDate } from './utils.js';

// ─── Render step indicator ─────────────────────────────────────────────────
renderStepIndicator('#step-indicator', ['Upload', 'Analysis', 'Navigator'], 2);

// ─── Load analysis data (user-scoped) ─────────────────────────────────────
const _uid = (() => { try { return JSON.parse(localStorage.getItem('mediscan_user'))?.id || 'anonymous'; } catch { return 'anonymous'; } })();
const stored = JSON.parse(localStorage.getItem(`analysisResult_${_uid}`) || 'null')
            || loadData('analysisResult');

// If no real result or it's a fallback, redirect back to upload
if (!stored || stored.source === 'mock_data' || stored.source === 'fallback_mock') {
  const container = document.querySelector('.container');

  // Show error card instead of fake data
  if (container) {
    container.innerHTML = `
      <div class="card" style="max-width:520px;margin:4rem auto;text-align:center;padding:2.5rem">
        <div style="font-size:3rem;margin-bottom:1rem">⚠️</div>
        <h2 style="margin-bottom:0.75rem">Analysis Failed</h2>
        <p style="color:var(--color-muted);margin-bottom:0.5rem">
          ${stored?._error
            ? `Error: <strong>${stored._error}</strong>`
            : 'No analysis result found.'}
        </p>
        <p style="color:var(--color-muted);margin-bottom:1.5rem;font-size:0.875rem">
          Make sure your Gemini API key is valid and the Generative Language API is enabled in your Google Cloud project.
        </p>
        <a href="upload.html" class="btn btn-primary">Try Again</a>
      </div>
    `;
  }

  // Stop further rendering
  throw new Error('No real analysis result — stopped rendering.');
}

const result = stored;

// ─── Populate Insight Card ─────────────────────────────────────────────────
const statusBadge = document.getElementById('statusBadge');
statusBadge.textContent = result.status || '—';
statusBadge.className = `badge ${result.statusBadge || 'badge-info'}`;

document.getElementById('summaryText').textContent = result.summary || 'No analysis data available.';
document.getElementById('nextStepsText').textContent = result.nextSteps || '—';

// ─── Populate Metrics Grid ─────────────────────────────────────────────────
const metricsGrid = document.getElementById('metricsGrid');

if (result.metrics && result.metrics.length) {
  metricsGrid.innerHTML = result.metrics.map(m => {
    const barClass = m.badge?.includes('severe') ? 'bar-severe'
      : m.badge?.includes('elevated') || m.badge?.includes('prediab') ? 'bar-elevated'
      : 'bar-normal';

    return `
      <div class="metric-card">
        <p class="metric-card__name">${m.name}</p>
        <div class="metric-card__value-row">
          <span class="metric-card__value">${m.value}</span>
          <span class="metric-card__unit">${m.unit}</span>
        </div>
        <div class="metric-card__badge">
          <span class="badge ${m.badge || 'badge-neutral'}">${m.status}</span>
        </div>
        <p class="metric-card__range">Normal: ${m.normalRange}</p>
        <div class="metric-card__bar">
          <div class="metric-card__bar-fill ${barClass}" style="width:${m.percent || 0}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Populate Other Results Table ──────────────────────────────────────────
const resultsBody = document.getElementById('resultsBody');

if (result.otherResults && result.otherResults.length) {
  resultsBody.innerHTML = result.otherResults.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.value}</td>
      <td><span class="badge ${r.badge || 'badge-neutral'}">${r.status}</span></td>
    </tr>
  `).join('');
}

// ─── Populate Disease Detection ────────────────────────────────────────────
if (result.diseases && result.diseases.length) {
  const diseaseSection = document.createElement('section');
  diseaseSection.className = 'analysis-other';
  diseaseSection.innerHTML = `
    <h3 class="analysis-section-title">Disease Detection</h3>
    <div class="metrics-grid">
      ${result.diseases.map(d => {
        const badge = d.likelihood === 'High' ? 'badge-severe'
                    : d.likelihood === 'Medium' ? 'badge-elevated'
                    : 'badge-normal';
        const urgencyBadge = d.urgency === 'Urgent' ? 'badge-severe'
                           : d.urgency === 'Consult Doctor' ? 'badge-elevated'
                           : 'badge-normal';
        return `
          <div class="metric-card">
            <p class="metric-card__name">${d.name}</p>
            <div class="metric-card__badge" style="margin:0.4rem 0">
              <span class="badge ${badge}">Likelihood: ${d.likelihood}</span>
            </div>
            <p class="metric-card__range" style="margin-bottom:0.5rem">${d.description}</p>
            <span class="badge ${urgencyBadge}">${d.urgency}</span>
          </div>`;
      }).join('')}
    </div>
  `;
  // Insert before the CTA banner
  document.querySelector('.analysis-cta')?.insertAdjacentElement('beforebegin', diseaseSection);
}

// ─── Populate Sidebar ──────────────────────────────────────────────────────
document.getElementById('sidebarFilename').textContent =
  loadData('uploadedFileName') || result.fileName || '—';

document.getElementById('sidebarDate').textContent =
  result.analysisDate ? formatDate(result.analysisDate) : formatDate(new Date());

// ─── Confidence Ring Animation ─────────────────────────────────────────────
const score = result.confidenceScore || 0;
const circumference = 2 * Math.PI * 50; // r=50
const offset = circumference - (score / 100) * circumference;

const circle = document.getElementById('confidenceCircle');
const valueEl = document.getElementById('confidenceValue');

// Animate after a short delay
setTimeout(() => {
  circle.style.strokeDashoffset = offset;
  valueEl.textContent = score + '%';
}, 200);

// ─── Download Summary → PDF ────────────────────────────────────────────────
document.getElementById('downloadSummaryBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('downloadSummaryBtn');
  const originalHTML = btn.innerHTML;

  // Loading state
  btn.disabled = true;
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      style="animation:spin 0.8s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Generating PDF…`;

  try {
    // Read user from localStorage
    let user = null;
    try { user = JSON.parse(localStorage.getItem('mediscan_user')); } catch (_) {}

    const { downloadAnalysisPDF } = await import('./pdf.js');
    await downloadAnalysisPDF({
      result,
      filename: loadData('uploadedFileName') || result.fileName || 'report',
      score,
      user,
    });
  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Could not generate PDF. Please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
});