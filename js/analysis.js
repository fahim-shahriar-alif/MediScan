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

// ─── Download Summary ──────────────────────────────────────────────────────
document.getElementById('downloadSummaryBtn')?.addEventListener('click', () => {
  const filename = loadData('uploadedFileName') || result.fileName || 'report';
  const date = result.analysisDate ? formatDate(result.analysisDate) : formatDate(new Date());

  const metricsText = (result.metrics || [])
    .map(m => `  • ${m.name}: ${m.value} ${m.unit} — ${m.status} (Normal: ${m.normalRange})`)
    .join('\n');

  const otherText = (result.otherResults || [])
    .map(r => `  • ${r.name}: ${r.value} — ${r.status}`)
    .join('\n');

  const content = `MEDISCAN HEALTH REPORT SUMMARY
================================
File: ${filename}
Date: ${date}
AI Confidence: ${score}%

OVERALL STATUS
--------------
${result.status || '—'}

SUMMARY
-------
${result.summary || '—'}

KEY METRICS
-----------
${metricsText || '  No metrics available'}

OTHER RESULTS
-------------
${otherText || '  No other results'}

NEXT STEPS
----------
${result.nextSteps || '—'}

RECOMMENDED SPECIALIST
----------------------
${result.specialistType || '—'}

--------------------------------
DISCLAIMER: This report is generated by AI for informational purposes only.
Always consult a qualified healthcare professional before making health decisions.
© ${new Date().getFullYear()} MediScan
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MediScan-Summary-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});