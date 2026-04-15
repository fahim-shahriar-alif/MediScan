/**
 * analysis.js — Render AI analysis results on the analysis page.
 */

import { renderStepIndicator } from './nav.js';
import { loadData, formatDate, MOCK_ANALYSIS } from './utils.js';

// ─── Render step indicator ─────────────────────────────────────────────────
renderStepIndicator('#step-indicator', ['Upload', 'Analysis', 'Navigator'], 2);

// ─── Load analysis data ────────────────────────────────────────────────────
const result = loadData('analysisResult') || MOCK_ANALYSIS;
const isDemo = !loadData('analysisResult');

// Show demo notice if using mock data
if (isDemo) {
  const notice = document.createElement('div');
  notice.className = 'alert alert-info';
  notice.style.cssText = 'margin:1rem 0 0;';
  notice.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    <div><strong>Demo Mode:</strong> Showing sample analysis. <a href="upload.html">Upload a real report</a> to see your results.</div>
  `;
  document.querySelector('.container')?.prepend(notice);
}

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