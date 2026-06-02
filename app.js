/* ══════════════════════════════════════════
   HYPOTHESIS TESTING TOOL — app.js
   C8: Manual Mode + C9: CSV Mode
   ══════════════════════════════════════════ */

"use strict";

// ─────────────────────────────────────────
//  MATH UTILITIES
// ─────────────────────────────────────────

/** Standard normal PDF */
function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/** Approximation of the standard normal CDF (Abramowitz & Stegun) */
function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Inverse normal CDF via bisection */
function invNormal(p) {
  let lo = -8, hi = 8, mid;
  for (let i = 0; i < 60; i++) {
    mid = (lo + hi) / 2;
    normalCDF(mid) < p ? lo = mid : hi = mid;
  }
  return mid;
}

/** Compute p-value given z and tail direction */
function pValue(z, direction) {
  if (direction === "left")  return normalCDF(z);
  if (direction === "right") return 1 - normalCDF(z);
  return 2 * (1 - normalCDF(Math.abs(z)));
}

/** Compute critical value(s) */
function criticalValue(alpha, direction) {
  if (direction === "left")  return invNormal(alpha);
  if (direction === "right") return invNormal(1 - alpha);
  return invNormal(1 - alpha / 2);   // returns positive value; negative is –this
}

/** z-score for proportions */
function zProportion(p0, phat, n) {
  const se = Math.sqrt(p0 * (1 - p0) / n);
  if (se === 0) return NaN;
  return (phat - p0) / se;
}

/** z-score for means */
function zMean(mu0, xbar, sigma, n) {
  const se = sigma / Math.sqrt(n);
  if (se === 0) return NaN;
  return (xbar - mu0) / se;
}

// ─────────────────────────────────────────
//  CANVAS DRAWING
// ─────────────────────────────────────────

const COLORS = {
  curve:  "#4fffb0",
  shade:  "rgba(79,255,176,0.22)",
  zLine:  "#ffd166",
  crit:   "#ff6b6b",
  critFill:"rgba(255,107,107,0.15)",
  text:   "#e8eaf2",
  muted:  "#7a8299",
  grid:   "#2a3148",
};

function drawCurve(canvas, z, direction, alpha) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const zMin = -4, zMax = 4;
  const pad = { l: 40, r: 20, t: 20, b: 40 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  const toX = z => pad.l + ((z - zMin) / (zMax - zMin)) * pw;
  const toY = y => pad.t + ph - (y / normalPDF(0)) * ph * 0.88;

  // Grid lines
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let v = -3; v <= 3; v++) {
    const x = toX(v);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Axis
  ctx.strokeStyle = COLORS.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t + ph);
  ctx.lineTo(pad.l + pw, pad.t + ph);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = COLORS.muted;
  ctx.font = "11px 'IBM Plex Mono'";
  ctx.textAlign = "center";
  for (let v = -3; v <= 3; v++) {
    ctx.fillText(v, toX(v), pad.t + ph + 18);
  }

  const zCrit = criticalValue(alpha, direction);
  const steps = 400;
  const dz = (zMax - zMin) / steps;

  // Shaded rejection region
  ctx.fillStyle = COLORS.critFill;
  ctx.beginPath();
  if (direction === "left" || direction === "two") {
    const zL = direction === "left" ? zCrit : -zCrit;
    ctx.moveTo(toX(zMin), toY(0));
    for (let i = 0; i <= steps; i++) {
      const zv = zMin + i * dz;
      if (zv > zL) break;
      ctx.lineTo(toX(zv), toY(normalPDF(zv)));
    }
    ctx.lineTo(toX(zL), toY(0));
    ctx.closePath(); ctx.fill();
  }
  if (direction === "right" || direction === "two") {
    const zR = direction === "right" ? zCrit : zCrit;
    ctx.beginPath();
    ctx.moveTo(toX(zR), toY(0));
    for (let i = 0; i <= steps; i++) {
      const zv = zMin + i * dz;
      if (zv < zR) continue;
      ctx.lineTo(toX(zv), toY(normalPDF(zv)));
    }
    ctx.lineTo(toX(zMax), toY(0));
    ctx.closePath(); ctx.fill();
  }

  // p-value shaded area (on top)
  ctx.fillStyle = COLORS.shade;
  ctx.beginPath();
  const shadeFn = () => {
    if (direction === "left") {
      ctx.moveTo(toX(zMin), toY(0));
      for (let i = 0; i <= steps; i++) {
        const zv = zMin + i * dz;
        if (zv > z) break;
        ctx.lineTo(toX(zv), toY(normalPDF(zv)));
      }
      ctx.lineTo(toX(Math.min(z, zMax)), toY(0));
      ctx.closePath(); ctx.fill();
    } else if (direction === "right") {
      ctx.moveTo(toX(Math.max(z, zMin)), toY(0));
      for (let i = 0; i <= steps; i++) {
        const zv = zMin + i * dz;
        if (zv < z) continue;
        ctx.lineTo(toX(zv), toY(normalPDF(zv)));
      }
      ctx.lineTo(toX(zMax), toY(0));
      ctx.closePath(); ctx.fill();
    } else {
      const az = Math.abs(z);
      // right tail
      ctx.moveTo(toX(Math.max(az, zMin)), toY(0));
      for (let i = 0; i <= steps; i++) {
        const zv = zMin + i * dz;
        if (zv < az) continue;
        ctx.lineTo(toX(zv), toY(normalPDF(zv)));
      }
      ctx.lineTo(toX(zMax), toY(0));
      ctx.closePath(); ctx.fill();
      // left tail
      ctx.beginPath();
      ctx.moveTo(toX(zMin), toY(0));
      for (let i = 0; i <= steps; i++) {
        const zv = zMin + i * dz;
        if (zv > -az) break;
        ctx.lineTo(toX(zv), toY(normalPDF(zv)));
      }
      ctx.lineTo(toX(Math.max(-az, zMin)), toY(0));
      ctx.closePath(); ctx.fill();
    }
  };
  shadeFn();

  // Normal curve
  ctx.strokeStyle = COLORS.curve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const zv = zMin + i * dz;
    const x = toX(zv), y = toY(normalPDF(zv));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Critical value line(s)
  const drawCritLine = (cv) => {
    const cx = toX(cv);
    ctx.strokeStyle = COLORS.crit;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, pad.t + ph); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.crit;
    ctx.font = "bold 11px 'IBM Plex Mono'";
    ctx.textAlign = "center";
    ctx.fillText(`z*=${cv.toFixed(2)}`, cx, pad.t + 14);
  };
  if (direction === "two") {
    drawCritLine(-zCrit);
    drawCritLine(zCrit);
  } else {
    drawCritLine(zCrit);
  }

  // Observed z line
  const zx = toX(Math.max(zMin, Math.min(zMax, z)));
  ctx.strokeStyle = COLORS.zLine;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(zx, pad.t); ctx.lineTo(zx, pad.t + ph); ctx.stroke();
  ctx.fillStyle = COLORS.zLine;
  ctx.font = "bold 11px 'IBM Plex Mono'";
  ctx.textAlign = z > 0 ? "right" : "left";
  const offset = z > 0 ? -5 : 5;
  ctx.fillText(`z=${z.toFixed(3)}`, zx + offset, pad.t + 28);

  // Legend
  ctx.textAlign = "left";
  ctx.font = "11px 'IBM Plex Mono'";
  ctx.fillStyle = COLORS.shade; ctx.fillRect(pad.l, 6, 12, 10);
  ctx.fillStyle = COLORS.text; ctx.fillText("p-value", pad.l + 16, 15);
  ctx.fillStyle = COLORS.critFill; ctx.fillRect(pad.l + 80, 6, 12, 10);
  ctx.fillStyle = COLORS.text; ctx.fillText("rejection region", pad.l + 96, 15);
}

// ─────────────────────────────────────────
//  OUTPUT RENDERING
// ─────────────────────────────────────────

function renderOutput({ canvas, zEl, pvalEl, zcritEl, alphaDispEl,
                         decisionEl, conclusionEl, errorsEl },
                       { z, pval, zcrit, alpha, direction, mode }) {

  drawCurve(canvas, z, direction, alpha);

  zEl.textContent     = isNaN(z)    ? "—" : z.toFixed(4);
  pvalEl.textContent  = isNaN(pval) ? "—" : pval.toFixed(4);
  zcritEl.textContent = isNaN(zcrit)? "—" :
    (direction === "two" ? `±${zcrit.toFixed(3)}` : zcrit.toFixed(3));
  if (alphaDispEl) alphaDispEl.textContent = alpha;

  const reject = pval < alpha;
  decisionEl.textContent = reject
    ? `✗ Reject H₀  (p = ${pval.toFixed(4)} < α = ${alpha})`
    : `✓ Fail to Reject H₀  (p = ${pval.toFixed(4)} ≥ α = ${alpha})`;
  decisionEl.className = "decision-box " + (reject ? "reject" : "fail");

  conclusionEl.textContent = reject
    ? `There is sufficient statistical evidence at the α = ${alpha} level to reject the null hypothesis. The sample data suggests a significant difference from the benchmark value.`
    : `There is not sufficient statistical evidence at the α = ${alpha} level to reject the null hypothesis. The sample data is consistent with the null hypothesis.`;

  if (errorsEl) {
    errorsEl.innerHTML =
      `<strong style="color:var(--accent2)">Type I Error (α):</strong> Rejecting H₀ when it is actually true — probability = ${alpha}.<br>` +
      `<strong style="color:var(--accent3)">Type II Error (β):</strong> Failing to reject H₀ when it is actually false — probability depends on effect size and sample size.`;
  }
}

// ─────────────────────────────────────────
//  C8 — MANUAL MODE
// ─────────────────────────────────────────

function syncPair(slider, input, cb) {
  slider.addEventListener("input", () => { input.value = slider.value; cb(); });
  input.addEventListener("input",  () => { slider.value = input.value;  cb(); });
}

function getManualMode() {
  return document.querySelector('input[name="calcMode"]:checked').value;
}
function getDirection(selId) {
  return document.getElementById(selId).value;
}
function getAlpha(sliderId, inputId) {
  return parseFloat(document.getElementById(inputId).value) || 0.05;
}

const mCanvas     = document.getElementById("m-curve");
const mZEl        = document.getElementById("m-z");
const mPvalEl     = document.getElementById("m-pval");
const mZcritEl    = document.getElementById("m-zcrit");
const mAlphaDisp  = document.getElementById("m-alpha-display");
const mDecision   = document.getElementById("m-decision");
const mConclusion = document.getElementById("m-conclusion");
const mErrors     = document.getElementById("m-errors");

function computeManual() {
  const mode      = getManualMode();
  const direction = getDirection("m-direction");
  const alpha     = parseFloat(document.getElementById("m-alpha-input").value) || 0.05;

  let z;
  if (mode === "proportion") {
    const p0   = parseFloat(document.getElementById("m-p0-input").value);
    const phat = parseFloat(document.getElementById("m-phat-input").value);
    const n    = parseInt(document.getElementById("m-n-prop-input").value);
    z = zProportion(p0, phat, n);
  } else {
    const mu0   = parseFloat(document.getElementById("m-mu0-input").value);
    const xbar  = parseFloat(document.getElementById("m-xbar-input").value);
    const sigma = parseFloat(document.getElementById("m-sigma-input").value);
    const n     = parseInt(document.getElementById("m-n-mean-input").value);
    z = zMean(mu0, xbar, sigma, n);
  }

  if (isNaN(z)) return;
  const pval  = pValue(z, direction);
  const zcrit = criticalValue(alpha, direction);

  renderOutput(
    { canvas: mCanvas, zEl: mZEl, pvalEl: mPvalEl, zcritEl: mZcritEl,
      alphaDispEl: mAlphaDisp, decisionEl: mDecision, conclusionEl: mConclusion, errorsEl: mErrors },
    { z, pval, zcrit, alpha, direction, mode }
  );
}

// Wire up all manual controls
syncPair(document.getElementById("m-alpha-slider"), document.getElementById("m-alpha-input"), computeManual);
syncPair(document.getElementById("m-p0-slider"),    document.getElementById("m-p0-input"),    computeManual);
syncPair(document.getElementById("m-phat-slider"),  document.getElementById("m-phat-input"),  computeManual);
syncPair(document.getElementById("m-n-prop-slider"),document.getElementById("m-n-prop-input"),computeManual);
syncPair(document.getElementById("m-mu0-slider"),   document.getElementById("m-mu0-input"),   computeManual);
syncPair(document.getElementById("m-xbar-slider"),  document.getElementById("m-xbar-input"),  computeManual);
syncPair(document.getElementById("m-sigma-slider"), document.getElementById("m-sigma-input"), computeManual);
syncPair(document.getElementById("m-n-mean-slider"),document.getElementById("m-n-mean-input"),computeManual);

document.getElementById("m-direction").addEventListener("change", computeManual);

// Toggle proportion / mean fields
document.querySelectorAll('input[name="calcMode"]').forEach(r => {
  r.addEventListener("change", () => {
    const isProp = getManualMode() === "proportion";
    document.getElementById("proportion-fields").style.display = isProp ? "" : "none";
    document.getElementById("mean-fields").style.display       = isProp ? "none" : "";
    computeManual();
  });
});

// Initial render
computeManual();

// ─────────────────────────────────────────
//  C9 — CSV MODE
// ─────────────────────────────────────────

let csvData = [];

const csvCanvas     = document.getElementById("csv-curve");
const csvZEl        = document.getElementById("csv-z");
const csvPvalEl     = document.getElementById("csv-pval");
const csvZcritEl    = document.getElementById("csv-zcrit");
const csvAlphaDisp  = document.getElementById("csv-alpha-display");
const csvDecision   = document.getElementById("csv-decision");
const csvConclusion = document.getElementById("csv-conclusion");
const csvSummary    = document.getElementById("csv-summary");
const csvStats      = document.getElementById("csv-stats");
const csvPlaceholder= document.getElementById("csv-placeholder");

/** Simple CSV parser */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ? vals[i].trim() : ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ""));
  return { headers, rows };
}

function populateSelect(sel, options) {
  sel.innerHTML = "";
  options.forEach(o => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = o;
    sel.appendChild(opt);
  });
}

document.getElementById("csv-file-input").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  document.getElementById("upload-label").textContent = file.name;

  const reader = new FileReader();
  reader.onload = e => {
    const { headers, rows } = parseCSV(e.target.result);
    csvData = rows;

    populateSelect(document.getElementById("csv-group-col"), headers);
    populateSelect(document.getElementById("csv-value-col"), headers);

    // Try to auto-set group column (first col) and value col (second col)
    if (headers.length >= 2) {
      document.getElementById("csv-group-col").value = headers[0];
      document.getElementById("csv-value-col").value = headers[1];
      updateGroupOptions();
    }

    document.getElementById("csv-config").style.display = "";
    csvPlaceholder.textContent = "Configure options and click Run Hypothesis Test";
    drawCurve(csvCanvas, 0, "two", 0.05);
  };
  reader.readAsText(file);
});

document.getElementById("csv-group-col").addEventListener("change", updateGroupOptions);

function updateGroupOptions() {
  const groupCol = document.getElementById("csv-group-col").value;
  const groups = [...new Set(csvData.map(r => r[groupCol]).filter(Boolean))];
  populateSelect(document.getElementById("csv-bench-group"), groups);
  populateSelect(document.getElementById("csv-test-group"), groups);
  if (groups.length >= 2) {
    document.getElementById("csv-bench-group").value = groups[0];
    document.getElementById("csv-test-group").value  = groups[1];
  }
}

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function variance(arr) {
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
}

document.getElementById("csv-run-btn").addEventListener("click", () => {
  if (!csvData.length) return;

  const groupCol  = document.getElementById("csv-group-col").value;
  const valueCol  = document.getElementById("csv-value-col").value;
  const bench     = document.getElementById("csv-bench-group").value;
  const test      = document.getElementById("csv-test-group").value;
  const direction = document.getElementById("csv-direction").value;
  const alpha     = parseFloat(document.getElementById("csv-alpha").value) || 0.05;
  const csvType   = document.querySelector('input[name="csvType"]:checked').value;

  const benchRows = csvData.filter(r => r[groupCol] === bench).map(r => parseFloat(r[valueCol])).filter(v => !isNaN(v));
  const testRows  = csvData.filter(r => r[groupCol] === test) .map(r => parseFloat(r[valueCol])).filter(v => !isNaN(v));

  if (!benchRows.length || !testRows.length) {
    alert("Could not extract numeric data. Check column selection."); return;
  }

  let z, summaryHTML;

  if (csvType === "proportion") {
    // proportion: value column should be 0/1
    const n1 = benchRows.length, n2 = testRows.length;
    const p1 = mean(benchRows), p2 = mean(testRows);
    const pPool = (benchRows.reduce((a,b)=>a+b,0) + testRows.reduce((a,b)=>a+b,0)) / (n1 + n2);
    const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
    z = se === 0 ? NaN : (p2 - p1) / se;

    summaryHTML = `<table>
      <tr><th>Group</th><th>n</th><th>Successes</th><th>Proportion p̂</th></tr>
      <tr><td>${bench} (benchmark)</td><td>${n1}</td><td>${benchRows.reduce((a,b)=>a+b,0)}</td><td>${p1.toFixed(4)}</td></tr>
      <tr><td>${test} (test)</td><td>${n2}</td><td>${testRows.reduce((a,b)=>a+b,0)}</td><td>${p2.toFixed(4)}</td></tr>
    </table>`;
  } else {
    // mean-based: two-sample z-test
    const n1 = benchRows.length, n2 = testRows.length;
    const m1 = mean(benchRows), m2 = mean(testRows);
    const v1 = variance(benchRows), v2 = variance(testRows);
    const se = Math.sqrt(v1/n1 + v2/n2);
    z = se === 0 ? NaN : (m2 - m1) / se;

    summaryHTML = `<table>
      <tr><th>Group</th><th>n</th><th>Mean</th><th>Std Dev</th></tr>
      <tr><td>${bench} (benchmark)</td><td>${n1}</td><td>${m1.toFixed(4)}</td><td>${Math.sqrt(v1).toFixed(4)}</td></tr>
      <tr><td>${test} (test)</td><td>${n2}</td><td>${m2.toFixed(4)}</td><td>${Math.sqrt(v2).toFixed(4)}</td></tr>
    </table>`;
  }

  if (isNaN(z)) { alert("z-score could not be computed. Check your data."); return; }

  const pval  = pValue(z, direction);
  const zcrit = criticalValue(alpha, direction);

  csvSummary.innerHTML = summaryHTML;
  csvSummary.style.display = "";
  csvStats.style.display = "";
  csvPlaceholder.style.display = "none";
  csvAlphaDisp.textContent = alpha;

  renderOutput(
    { canvas: csvCanvas, zEl: csvZEl, pvalEl: csvPvalEl, zcritEl: csvZcritEl,
      alphaDispEl: csvAlphaDisp, decisionEl: csvDecision, conclusionEl: csvConclusion,
      errorsEl: null },
    { z, pval, zcrit, alpha, direction, mode: csvType }
  );
});

// ─────────────────────────────────────────
//  TABS
// ─────────────────────────────────────────

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    // Redraw canvas on tab switch
    if (btn.dataset.tab === "manual") computeManual();
    else drawCurve(csvCanvas, 0, "two", 0.05);
  });
});

// ─────────────────────────────────────────
//  INITIAL BLANK CSV CANVAS
// ─────────────────────────────────────────
drawCurve(csvCanvas, 0, "two", 0.05);
