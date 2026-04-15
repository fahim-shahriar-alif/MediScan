/**
 * pdf.js — Generate a styled PDF summary for MediScan analysis results.
 * Uses jsPDF (loaded via CDN in analysis.html).
 * No build step required.
 */

export async function downloadAnalysisPDF({ result, filename, score, user }) {
  // jsPDF is loaded globally via CDN script tag
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const PW = 210;   // page width mm
  const PH = 297;   // page height mm
  const ML = 18;    // margin left
  const MR = 18;    // margin right
  const CW = PW - ML - MR;  // content width
  let   Y  = 0;     // current Y cursor

  // ── Colour palette ────────────────────────────────────────────────────────
  const C = {
    primary:     [37,  99,  235],
    primaryDark: [30,  58, 138],
    success:     [22, 163,  74],
    warning:     [245,158, 11],
    danger:      [239, 68,  68],
    text:        [17,  24,  39],
    muted:       [107,114, 128],
    border:      [229,231, 235],
    bg:          [239,246, 255],
    white:       [255,255, 255],
    darkBg:      [30,  58, 138],
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function setFont(style = 'normal', size = 10) {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  }

  function rgb(arr) { doc.setTextColor(...arr); }
  function fill(arr) { doc.setFillColor(...arr); }
  function stroke(arr) { doc.setDrawColor(...arr); }

  function rect(x, y, w, h, color, radius = 0) {
    fill(color);
    stroke(color);
    if (radius > 0) doc.roundedRect(x, y, w, h, radius, radius, 'F');
    else doc.rect(x, y, w, h, 'F');
  }

  function line(x1, y1, x2, y2, color = C.border, lw = 0.3) {
    doc.setLineWidth(lw);
    stroke(color);
    doc.line(x1, y1, x2, y2);
  }

  function text(str, x, y, opts = {}) {
    doc.text(String(str ?? '—'), x, y, opts);
  }

  function wrap(str, x, y, maxW, lineH = 5) {
    const lines = doc.splitTextToSize(String(str ?? ''), maxW);
    lines.forEach((l, i) => text(l, x, y + i * lineH));
    return y + lines.length * lineH;
  }

  function checkPage(needed = 20) {
    if (Y + needed > PH - 20) {
      doc.addPage();
      Y = 20;
      drawPageFooter();
    }
  }

  function badgeColor(badge) {
    if (!badge) return { bg: C.border, fg: C.muted };
    if (badge.includes('normal') || badge.includes('optimal'))
      return { bg: [220,252,231], fg: [22,101,52] };
    if (badge.includes('elevated') || badge.includes('prediab'))
      return { bg: [254,249,195], fg: [146,64,14] };
    if (badge.includes('severe') || badge.includes('urgent'))
      return { bg: [254,226,226], fg: [153,27,27] };
    return { bg: C.bg, fg: C.muted };
  }

  // ── Logo (text-based since SVG can't be embedded directly) ────────────────
  async function drawLogo(x, y) {
    // Try to load the SVG as an image via canvas
    try {
      const img = await loadImage('../assets/logo.svg');
      // Draw at a reasonable size — logo is 2816×1536 aspect ~1.83:1
      doc.addImage(img, 'PNG', x, y, 38, 20.7);
      return 20.7;
    } catch {
      // Fallback: text logo
      fill(C.primary);
      doc.circle(x + 4, y + 4, 4, 'F');
      setFont('bold', 14);
      rgb(C.primary);
      text('MediScan', x + 10, y + 6);
      return 10;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // ── Page footer ───────────────────────────────────────────────────────────
  function drawPageFooter() {
    const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
    const total   = doc.internal.getNumberOfPages();
    line(ML, PH - 14, PW - MR, PH - 14);
    setFont('normal', 8);
    rgb(C.muted);
    text('MediScan — AI Health Report Summary', ML, PH - 9);
    text(`Page ${pageNum} of ${total}`, PW - MR, PH - 9, { align: 'right' });
    text('This report is for informational purposes only. Not a substitute for professional medical advice.', PW / 2, PH - 5, { align: 'center' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Header banner ─────────────────────────────────────────────────────────
  rect(0, 0, PW, 38, C.primaryDark);

  // Logo
  try {
    const logoImg = await loadImage('../assets/logo.svg');
    doc.addImage(logoImg, 'PNG', ML, 7, 44, 24);
  } catch {
    setFont('bold', 16);
    rgb(C.white);
    text('MediScan', ML, 22);
  }

  // Header right text
  setFont('normal', 8);
  rgb([180, 210, 255]);
  text('AI-Powered Health Report', PW - MR, 13, { align: 'right' });
  setFont('bold', 11);
  rgb(C.white);
  text('Medical Analysis Summary', PW - MR, 21, { align: 'right' });
  setFont('normal', 8);
  rgb([180, 210, 255]);
  const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  text(`Generated: ${today}`, PW - MR, 29, { align: 'right' });

  Y = 46;

  // ── Patient / Report info card ────────────────────────────────────────────
  rect(ML, Y, CW, 28, C.bg, 3);
  stroke(C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, Y, CW, 28, 3, 3, 'S');

  // Left: patient
  setFont('bold', 8);
  rgb(C.muted);
  text('PATIENT', ML + 6, Y + 7);
  setFont('bold', 11);
  rgb(C.text);
  text(user?.name || 'Patient', ML + 6, Y + 14);
  setFont('normal', 9);
  rgb(C.muted);
  text(user?.email || 'Not specified', ML + 6, Y + 20);

  // Divider
  line(ML + CW / 3, Y + 4, ML + CW / 3, Y + 24, C.border);

  // Middle: file
  setFont('bold', 8);
  rgb(C.muted);
  text('REPORT FILE', ML + CW / 3 + 6, Y + 7);
  setFont('normal', 9);
  rgb(C.text);
  const fname = filename || result.fileName || 'Unknown';
  text(fname.length > 28 ? fname.slice(0, 25) + '…' : fname, ML + CW / 3 + 6, Y + 14);
  setFont('normal', 8);
  rgb(C.muted);
  text(result.analysisDate
    ? new Date(result.analysisDate).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
    : today,
    ML + CW / 3 + 6, Y + 20);

  // Divider
  line(ML + (CW * 2) / 3, Y + 4, ML + (CW * 2) / 3, Y + 24, C.border);

  // Right: confidence
  setFont('bold', 8);
  rgb(C.muted);
  text('AI CONFIDENCE', ML + (CW * 2) / 3 + 6, Y + 7);
  setFont('bold', 16);
  rgb(C.primary);
  text(`${score}%`, ML + (CW * 2) / 3 + 6, Y + 18);

  Y += 34;

  // ── Overall Status ────────────────────────────────────────────────────────
  const { bg: sBg, fg: sFg } = badgeColor(result.statusBadge);
  rect(ML, Y, CW, 22, C.darkBg, 3);

  // Icon circle
  fill([255,255,255,0.15]);
  doc.circle(ML + 12, Y + 11, 6, 'F');
  setFont('bold', 10);
  rgb(C.white);
  text('AI', ML + 12, Y + 13.5, { align: 'center' });

  setFont('bold', 9);
  rgb([180, 210, 255]);
  text('OVERALL STATUS', ML + 22, Y + 8);
  setFont('bold', 12);
  rgb(C.white);
  text(result.status || 'Analysis Complete', ML + 22, Y + 16);

  // Badge pill on right
  const badgeW = 32;
  rect(PW - MR - badgeW - 2, Y + 6, badgeW, 10, sBg, 5);
  setFont('bold', 8);
  rgb(sFg);
  text(result.status || '', PW - MR - badgeW / 2 - 2, Y + 12.5, { align: 'center' });

  Y += 28;

  // ── AI Summary ────────────────────────────────────────────────────────────
  setFont('bold', 10);
  rgb(C.text);
  text('AI Health Summary', ML, Y);
  Y += 5;
  line(ML, Y, ML + CW, Y);
  Y += 4;

  setFont('normal', 9);
  rgb(C.muted);
  Y = wrap(result.summary || 'No summary available.', ML, Y, CW, 5);
  Y += 6;

  // ── Next Steps ────────────────────────────────────────────────────────────
  checkPage(30);
  rect(ML, Y, CW, 6, C.bg, 2);
  setFont('bold', 9);
  rgb(C.primary);
  text('RECOMMENDED NEXT STEPS', ML + 4, Y + 4.5);
  Y += 9;

  setFont('normal', 9);
  rgb(C.text);
  Y = wrap(result.nextSteps || 'Consult a healthcare professional.', ML + 4, Y, CW - 8, 5);
  Y += 8;

  // ── Key Metrics ───────────────────────────────────────────────────────────
  checkPage(40);
  setFont('bold', 10);
  rgb(C.text);
  text('Key Metrics', ML, Y);
  Y += 5;
  line(ML, Y, ML + CW, Y);
  Y += 5;

  const metrics = result.metrics || [];
  if (metrics.length === 0) {
    setFont('normal', 9); rgb(C.muted);
    text('No key metrics available.', ML, Y); Y += 8;
  } else {
    // 2-column grid
    const colW = (CW - 6) / 2;
    metrics.forEach((m, i) => {
      if (i % 2 === 0) checkPage(28);
      const col = i % 2;
      const mx  = ML + col * (colW + 6);
      const my  = Y;

      // Card background
      rect(mx, my, colW, 24, C.bg, 2);
      stroke(C.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(mx, my, colW, 24, 2, 2, 'S');

      // Metric name
      setFont('bold', 8);
      rgb(C.muted);
      text(m.name, mx + 4, my + 6);

      // Value + unit
      setFont('bold', 14);
      rgb(C.text);
      text(m.value, mx + 4, my + 15);
      setFont('normal', 8);
      rgb(C.muted);
      text(m.unit, mx + 4 + doc.getTextWidth(String(m.value)) + 2, my + 15);

      // Status badge
      const { bg: mBg, fg: mFg } = badgeColor(m.badge);
      const bw = Math.min(doc.getTextWidth(m.status) + 6, colW - 8);
      rect(mx + colW - bw - 4, my + 4, bw, 7, mBg, 3);
      setFont('bold', 7);
      rgb(mFg);
      text(m.status, mx + colW - bw / 2 - 4, my + 8.5, { align: 'center' });

      // Normal range
      setFont('normal', 7);
      rgb(C.muted);
      text(`Normal: ${m.normalRange}`, mx + 4, my + 21);

      // Progress bar
      const barX = mx + 4;
      const barY = my + 22.5;
      const barW = colW - 8;
      rect(barX, barY, barW, 1.5, C.border);
      const barColor = m.badge?.includes('severe') ? C.danger
        : m.badge?.includes('elevated') || m.badge?.includes('prediab') ? C.warning
        : C.success;
      rect(barX, barY, barW * ((m.percent || 0) / 100), 1.5, barColor);

      if (col === 1 || i === metrics.length - 1) Y += 28;
    });
    if (metrics.length % 2 !== 0) Y += 0; // already advanced
  }

  // ── Other Test Results ────────────────────────────────────────────────────
  const others = result.otherResults || [];
  if (others.length > 0) {
    checkPage(40);
    Y += 2;
    setFont('bold', 10);
    rgb(C.text);
    text('Other Test Results', ML, Y);
    Y += 5;
    line(ML, Y, ML + CW, Y);
    Y += 4;

    // Table header
    rect(ML, Y, CW, 7, C.primaryDark, 2);
    setFont('bold', 8);
    rgb(C.white);
    text('Test Name', ML + 4, Y + 5);
    text('Value', ML + CW * 0.5, Y + 5);
    text('Status', ML + CW * 0.75, Y + 5);
    Y += 7;

    others.forEach((r, i) => {
      checkPage(8);
      const rowBg = i % 2 === 0 ? C.white : C.bg;
      rect(ML, Y, CW, 7, rowBg);
      stroke(C.border);
      doc.setLineWidth(0.15);
      doc.rect(ML, Y, CW, 7, 'S');

      setFont('normal', 8);
      rgb(C.text);
      text(r.name, ML + 4, Y + 5);
      text(r.value, ML + CW * 0.5, Y + 5);

      // Status badge
      const { bg: rBg, fg: rFg } = badgeColor(r.badge);
      const rw = Math.min(doc.getTextWidth(r.status) + 6, 35);
      rect(ML + CW * 0.75, Y + 1, rw, 5, rBg, 2);
      setFont('bold', 7);
      rgb(rFg);
      text(r.status, ML + CW * 0.75 + rw / 2, Y + 4.5, { align: 'center' });

      Y += 7;
    });
    Y += 4;
  }

  // ── Specialist Recommendation ─────────────────────────────────────────────
  if (result.specialistType) {
    checkPage(20);
    rect(ML, Y, CW, 16, [239,246,255], 3);
    stroke(C.primary);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, Y, CW, 16, 3, 3, 'S');

    setFont('bold', 8);
    rgb(C.primary);
    text('RECOMMENDED SPECIALIST', ML + 6, Y + 6);
    setFont('bold', 11);
    rgb(C.text);
    text(result.specialistType, ML + 6, Y + 13);
    Y += 20;
  }

  // ── Disclaimer ────────────────────────────────────────────────────────────
  checkPage(24);
  Y += 4;
  rect(ML, Y, CW, 20, [254,249,195], 3);
  stroke([245,158,11]);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, Y, CW, 20, 3, 3, 'S');

  setFont('bold', 8);
  rgb([146,64,14]);
  text('⚠  MEDICAL DISCLAIMER', ML + 6, Y + 7);
  setFont('normal', 7.5);
  rgb([146,64,14]);
  Y = wrap(
    'This report is generated by AI for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before making any health decisions.',
    ML + 6, Y + 13, CW - 12, 4.5
  );
  Y += 8;

  // ── Footer on all pages ───────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter();
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeName = (user?.name || 'Patient').replace(/\s+/g, '_');
  doc.save(`MediScan_Report_${safeName}_${dateStr}.pdf`);
}
