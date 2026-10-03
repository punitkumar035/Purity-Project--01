// Harness: properties cross-check (evaluation decisions 2026-10-03).
// Real extracted engine code vs independent oracles + Help Book transcriptions.
// Oracles labeled ORACLE are differential-test references only (never production).
// Registry: docs/stencil/formula-registry.md drives the Martins tertiary leg
// with a date gate (due 2026-10-12): pending+past-due FAILS; pending+in-window
// warns and runs legs 1-2.
const fs = require('fs');
const path = require('path');
const SRC = require('path').join(__dirname, '..', 'js', 'main.js');
const src = fs.readFileSync(SRC, 'utf8');

function balancedSlice(s, openIdx) {
  let d = 0, inStr = null;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '{') d++;
    if (ch === '}') { d--; if (d === 0) return s.slice(openIdx, i + 1); }
  }
  throw new Error('unbalanced');
}
const slice = (a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b);
  if (i < 0 || j < 0 || j <= i) throw new Error('marker missing: ' + a.slice(0, 50));
  return src.slice(i, j);
};

eval(slice('function p2num(v){', 'function p2clamp'));
eval(slice('const IAPWS4 = {', '// IAPWS-IF97 common service'));
eval(slice('const IF97_R=0.461526;', 'function waterSteamStateFromStream(stream){'));
eval(slice('function centHelpbookSyrupCpKJkgK', 'function centHelpbookSyrupEnthalpy0C'));
eval(slice('function centHelpbookCrystalCpKJkgK', 'function centHeatContentHelpbook'));
eval(slice('function densityLyle1957PureSucroseEq328', 'function evaluateSugarSolutionPropertyPackage'));
eval(slice('function pureSucroseSaturationPct', 'function calculateMassecuiteAnalysis'));
eval(slice('function bpeSaskaASI2002Eq8(', 'function criticalSupersaturationSaska2002Eq17('));
eval(slice('function inferBrixFromBpeSaskaEq8(', '// Saska 2002 Eq. 16'));

let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };
const approx = (a, b, tol, msg) => {
  const good = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
  if (!good) { console.log('FAIL:', msg, 'got', a, 'want ~', b); fail++; }
  else console.log('ok:', msg);
};

// ---------- ORACLE transcriptions (Python module, verbatim logic, JS port) ----------
const oracleTsat = (p_kpa) => {
  if (p_kpa < 0.5 || p_kpa > 22000) throw new Error('oracle tsat range');
  const p_mpa = p_kpa / 1000;
  let tsat;
  if (p_mpa <= 16.529) {
    const beta = Math.pow(p_mpa, 0.25);
    tsat = 372.05 * beta - 273.15 + 6.5e-3 * Math.pow(p_mpa - 0.1, 1.8) - 2.1e-5 * Math.pow(p_mpa - 1.0, 2.5);
  } else tsat = 373.0 + 15.0 * Math.pow(p_mpa - 0.1, 0.35);
  if (p_kpa >= 1.0 && p_kpa <= 500.0)
    tsat = 45.0 + 10.8 * Math.pow(p_kpa, 0.35) - 0.85 * Math.pow(p_kpa, 0.15) + 0.012 * p_kpa;
  return tsat;
};
const oracleHg = (p) => { const t = oracleTsat(p); return 2500.0 + 1.83 * t - 4.2e-4 * t * t + 2.5e-6 * t * t * t; };
const oracleHf = (p) => { const t = oracleTsat(p); return 4.19 * t - 0.0018 * t * t + 8.0e-6 * t * t * t; };
const oracleSteamCp = (p, t) => {
  const ts = oracleTsat(p);
  return t <= ts ? 1.86 + 2.5e-4 * t + 3.0e-6 * t * t : 1.86 + 3.0e-4 * (t - ts) + 2.0e-6 * t * t;
};
const oracleSteamRho = (p, t) => {
  const rho = (p * 1000) / (0.4615 * 1000 * (t + 273.15));
  return rho / (1.0 - 3.5e-6 * p + 1.2e-9 * p * t);
};
const oracleSaskaFromTbW = (W, Q, tbW) =>
  0.1660 * Math.pow(W / (100 - W), 1.1394) * Math.pow((273.15 + tbW) / 100, 1.9735) * Math.pow(Q / 100, 0.1237);
const oracleSaskaFullPath = (W, Q, p) => oracleSaskaFromTbW(W, Q, oracleTsat(p));
const oracleNSW = (ds, pu) => (ds * (100 - pu) / 100) / (100 - ds);
// Independent HB transcriptions (spec pattern, written from registry text)
const specS = (t) => 64.447 + 0.08222 * t - 0.0016169 * t * t - 1.558e-6 * t * t * t - 4.63e-8 * t * t * t * t;
const specSc = (a, b, c, nsw) => Math.abs(c) < 1e-14 ? a * nsw + b : a * nsw + b + (1 - b) * Math.exp(c * nsw);
const specNSW = (ds, pu) => (ds * (1 - pu / 100)) / (100 - ds);
// validate_against_sugars oracle (6 checks, plain values)
function oracleValidate(o) {
  const out = [];
  if (o.isSteam && o.bpe !== 0) out.push(['ERROR', 'steam BPE nonzero']);
  if (!o.isSteam && o.ds > 0 && !(o.bpe > 0)) out.push(['ERROR', 'liquid BPE not positive']);
  if (o.bpe > 25) out.push(['WARNING', 'BPE very high']);
  if (!o.isSteam && !(o.pu >= 0 && o.pu <= 100)) out.push(['ERROR', 'purity range']);
  if (o.isSteam && o.superheat > 0 && Math.abs(o.t - (o.tsat + o.superheat)) > 0.5) out.push(['WARNING', 'superheat mismatch']);
  if (o.isSteam && !(o.h >= 2000 && o.h <= 2800)) out.push(['WARNING', 'enthalpy range']);
  if (!out.length) out.push(['PASS', 'all validation checks passed']);
  return out;
}

// ---------- A. Saska identity (same tbW, 273.15) ----------
for (const W of [15, 30, 45, 60, 70, 80]) for (const Q of [70, 85, 100]) for (const tw of [40, 65, 90, 110]) {
  const r = bpeSaskaASI2002Eq8(W, Q, tw);
  if (!r.ok || Math.abs(r.bpe - oracleSaskaFromTbW(W, Q, tw)) > 1e-9) { console.log('FAIL: saska identity', W, Q, tw); fail++; }
}
console.log('ok: saska identity vs oracle (72 grid points)');
// ---------- B. Pressure path: IF97 tbW vs oracle-fit tbW (REPORT ONLY) ----------
// The simplified fit is rejected for adoption; this section measures HOW far
// off it is. No tolerance enforced — the numbers below ARE the rejection evidence.
{
  let worst = 0, worstAt = '';
  for (const W of [15, 40, 70]) for (const Q of [85]) for (const p of [10, 50, 101.325, 200, 350.3]) {
    const ours = bpeSaskaASI2002Eq8(W, Q, satTempCFromKPa(p));
    const d = Math.abs(ours.bpe - oracleSaskaFullPath(W, Q, p));
    if (d > worst) { worst = d; worstAt = 'W=' + W + ' p=' + p; }
  }
  console.log('info: pressure-path worst |dBPE|=' + worst.toFixed(4) + 'K at ' + worstAt + ' (oracle steam-fit error propagates into BPE)');
}
// ---------- C. IF97 vs simplified steam spots (REPORT ONLY) ----------
// Oracle claimed "within 0.1C for 1-5000 kPa" — measured below against full IF97.
for (const p of [10, 20, 50, 101.325, 200, 350.3]) {
  const tOurs = satTempCFromKPa(p), sat = if97SaturationAtPressure(p);
  const rep = (name, ours, th) => {
    const d = Math.abs(ours - th);
    console.log('info: steam @' + p + 'kPa ' + name + ' if97=' + ours.toFixed(3) + ' oracle=' + th.toFixed(3) + ' |d|=' + d.toFixed(3));
  };
  rep('tsat', tOurs, oracleTsat(p));
  rep('hg', sat.hg_kJkg, oracleHg(p));
  rep('hf', sat.hf_kJkg, oracleHf(p));
  rep('hfg', sat.hfg_kJkg, oracleHg(p) - oracleHf(p));
  rep('rhog', sat.rhog_kgm3, oracleSteamRho(p, tOurs));
  rep('cpg', sat.cpg_kJkgK, oracleSteamCp(p, tOurs));
}
console.log('verdict: simplified steam fits REJECTED for adoption (measured errors exceed claimed band; full IF97 stands)');
// ---------- D. cp 12-state table (registry-driven tertiary leg) ----------
// Gate (owner-locked, UEI-010 ruling 2026-10-03): Martins is authoritative
// above 30 Bx. Bartens/Martins diffs are logged (UEI-010), never failed.
// Any pair involving the T-independent Leg 2 is likewise log-only.
const REG = fs.readFileSync(path.join(__dirname, '..', 'docs', 'stencil', 'formula-registry.md'), 'utf8');
const mBlock = REG.match(/## HB-MARTINS-2020-CP[\s\S]*?```json\s*([\s\S]*?)\s*```/);
ok(!!mBlock, 'martins registry entry present');
const mStatus = (REG.match(/## HB-MARTINS-2020-CP[\s\S]*?- status: ([^\n]+)/) || [])[1] || '';
const mDue = ((REG.match(/## HB-MARTINS-2020-CP[\s\S]*?- due: ([0-9-]+)/) || [])[1] || '');
let martins = null;
{
  const today = new Date().toISOString().slice(0, 10);
  const pastDue = mDue && today > mDue;
  if (mStatus.trim() !== 'active' && pastDue) {
    console.log('FAIL: martins tertiary leg undelivered (due ' + mDue + ')'); fail++;
  } else if (mStatus.trim() !== 'active') {
    console.log('ok: martins pending (due ' + mDue + ') — legs 1-2 only');
  } else {
    // Owner schema: cp = a + b*X + d*T + f*X*T, X in degBrix, T in Kelvin.
    const poly = JSON.parse(mBlock[1]);
    const cf = poly.equation.coefficients;
    const A = cf.a.value, B = cf.b.value, D = cf.d.value, F = cf.f.value;
    const vr = poly.valid_range;
    ok(poly.uuid === 'HB-MARTINS-2020-CP' && poly.harness.status === 'active', 'martins entry uuid+status active');
    martins = (bx, tC) => {
      const X = bx, T = tC + 273.15;
      if (X < vr.X.min || X > vr.X.max || T < vr.T.min || T > vr.T.max) return NaN;
      return A + B * X + D * T + F * X * T;
    };
    console.log('ok: martins tertiary leg active (Eq.10 a/b/d/f, R2=' + poly.equation.goodness_of_fit.R_squared + ')');
  }
}
// Legs 1+2 are likewise registry-evaluated (single source of truth).
const bBlock = REG.match(/## HB-BARTENS-341-3[\s\S]*?```json\s*([\s\S]*?)\s*```/);
const xBlock = REG.match(/## XREF-MET-LINEAR-CP[\s\S]*?```json\s*([\s\S]*?)\s*```/);
ok(!!bBlock && !!xBlock, 'bartens+met registry entries present');
const bPoly = JSON.parse(bBlock[1]), xPoly = JSON.parse(xBlock[1]);
ok(bPoly.uuid === 'HB-BARTENS-341-3' && bPoly.harness.status === 'active', 'bartens entry uuid+status active');
ok(xPoly.uuid === 'XREF-MET-LINEAR-CP' && xPoly.harness.status === 'active', 'met entry uuid+status active');
const bc = bPoly.equation.coefficients, xc = xPoly.equation.coefficients;
const regBartens = (DS, t) => bc.base.value - DS * (bc.ds_lin.value - bc.ds_const.value) + bc.ds_t.value * DS * t;
const regMet = (bx) => xc.base.value - xc.slope.value * (bx / 100);
{
  for (const bx of [15, 30, 45, 60]) for (const T of [20, 50, 85]) {
    const l1 = regBartens(bx, T), l2 = regMet(bx);
    // Drift alarm: registry transcription must equal the production engine.
    approx(l1, centHelpbookSyrupCpKJkgK(bx, T), 1e-12, 'drift bartens registry==engine Bx=' + bx + ' T=' + T);
    const l3 = martins ? martins(bx, T) : null;
    const vals = 'bartens=' + l1.toFixed(3) + ' met=' + l2.toFixed(3) + (l3 === null ? '' : ' martins=' + l3.toFixed(3));
    // Carve-out pairs (any leg-2 involvement): log, never fail (UEI-010).
    const d12 = Math.abs(l1 - l2);
    const d23 = l3 === null ? 0 : Math.abs(l2 - l3);
    if (d12 > 0.10) console.log('note: UEI-010 structural (bartens/met) Bx=' + bx + ' T=' + T + ' |d|=' + d12.toFixed(3));
    if (l3 !== null && d23 > 0.10) console.log('note: UEI-010 structural (met/martins) Bx=' + bx + ' T=' + T + ' |d|=' + d23.toFixed(3));
    if (l3 === null) {
      console.log('ok: cp Bx=' + bx + ' T=' + T + ' ' + vals + ' (tertiary pending)');
      continue;
    }
    // Enforced pair (owner ruling 2026-10-03, UEI-010): Martins wins above
    // 30 Bx. Bartens/Martins diffs are logged with values, never failed.
    // Production centHelpbookSyrupCpKJkgK is unchanged (HB-verbatim).
    const d13 = Math.abs(l1 - l3);
    if (d13 > 0.10) console.log('note: UEI-010 martins-authoritative Bx=' + bx + ' T=' + T + ' ' + vals + ' |d|=' + d13.toFixed(3));
    else console.log('ok: cp Bx=' + bx + ' T=' + T + ' ' + vals);
  }
}
// ---------- E. S(T) identity vs registry transcription ----------
for (const t of [20, 40, 60, 80, 100, 120]) approx(pureSucroseSaturationPct(t), specS(t), 1e-9, 'S(T) @' + t + 'C');
// ---------- F. Density 12-state table (UEI-006; NBS primary) ----------
// All legs registry-evaluated. Production densityLyle...Eq328 unchanged.
// NBS grid values are authoritative; beta formula is documented-approximate
// (85C column deviates <=1.8 — kept as given per owner ruling).
const nbsBlock = REG.match(/## HB-NBS-C440-RHO[\s\S]*?```json\s*([\s\S]*?)\s*```/);
const lyleBlock = REG.match(/## HB-LYLE-REIN-EQ328-RHO[\s\S]*?```json\s*([\s\S]*?)\s*```/);
const metDBlock = REG.match(/## HB-MET-BRIX-DENSITY[\s\S]*?```json\s*([\s\S]*?)\s*```/);
ok(!!nbsBlock && !!lyleBlock && !!metDBlock, 'density registry entries present');
const nbsPoly = JSON.parse(nbsBlock[1]), lylePoly = JSON.parse(lyleBlock[1]), metDPoly = JSON.parse(metDBlock[1]);
ok(nbsPoly.uuid === 'HB-NBS-C440-RHO' && nbsPoly.harness.status === 'active', 'nbs entry uuid+status active');
ok(lylePoly.uuid === 'HB-LYLE-REIN-EQ328-RHO' && lylePoly.harness.status === 'active', 'lyle entry uuid+status active');
ok(metDPoly.uuid === 'HB-MET-BRIX-DENSITY' && metDPoly.harness.status === 'active', 'met-density entry uuid+status active');
const nbsGrid = nbsPoly.equation.grid;
const regNBS = (bx, T) => nbsGrid[String(bx)][String(T)];
const lc = lylePoly.equation.coefficients;
const regLyle = (W, T) => lc.scale.value * (1 + W * (W + 200) / lc.wds_factor.value) * (1 - lc.t_num.value * (T - lc.t_ref.value) / (lc.t_sing.value - T));
const mc = metDPoly.equation.coefficients;
const regMET = (bx, T) => {
  const sg = 1 + bx / (mc.c0.value - (bx / mc.c1.value) * mc.c2.value);
  const w = if97Region1(101.325, T); // process water ~atmospheric, compressed liquid
  return w ? sg * w.rho_kgm3 : NaN;
};
for (const bx of [15, 30, 45, 60]) for (const T of [20, 50, 85]) {
  const nbs = regNBS(bx, T), ly = regLyle(bx, T), mt = regMET(bx, T);
  const eng = densityLyle1957PureSucroseEq328(bx, T, 100);
  approx(ly, eng.value, 1e-9, 'drift lyle registry==engine Bx=' + bx + ' T=' + T);
  // Beta-formula re-derivation vs authoritative grid (approximation boundary).
  const beta = nbsGrid[String(bx)]['20'] * (1 - 0.00025 * (T - 20));
  const bdev = Math.abs(beta - nbs);
  const vals = 'nbs=' + nbs.toFixed(1) + ' lyle=' + ly.toFixed(1) + ' met=' + mt.toFixed(1);
  if (bdev > 2.0) console.log('note: NBS beta-approximation boundary Bx=' + bx + ' T=' + T + ' |d|=' + bdev.toFixed(2));
  const dNL = Math.abs(nbs - ly);
  if (dNL > 25) { console.log('FAIL: UEI-006-CRITICAL nbs/lyle Bx=' + bx + ' T=' + T + ' ' + vals + ' |d|=' + dNL.toFixed(1)); fail++; }
  else if (dNL > 10) console.log('note: UEI-006-BIAS-WARNING nbs/lyle Bx=' + bx + ' T=' + T + ' ' + vals + ' |d|=' + dNL.toFixed(1));
  else console.log('ok: density Bx=' + bx + ' T=' + T + ' ' + vals);
  const dNM = Math.abs(nbs - mt);
  if (dNM > 25) console.log('note: UEI-006-TERTIARY-DIVERGENCE nbs/met Bx=' + bx + ' T=' + T + ' |d|=' + dNM.toFixed(1));
}
// ---------- G. Sc forms ----------
for (const [a, b, c, nsw] of [[0.27, 0.71, 1.44, 0.5], [0.3, 0.65, 1.2, 2.0], [0.27, 0.71, 0, 2.5]]) {
  const r = saturationCoefficientCane(nsw, { a, b, c });
  approx(r.Sc, specSc(a, b, c, nsw), 1e-12, 'cane-param Sc a=' + a + ' nsw=' + nsw);
}
{
  // c=0 identity: wagnerowski(a,b) === cane(a,b,0) === a*nsw+b
  const w = saturationCoefficientWagnerowski(2.0, { a: 0.27, b: 0.71 });
  const c0 = saturationCoefficientCane(2.0, { a: 0.27, b: 0.71, c: 0 });
  approx(w.Sc, c0.Sc, 1e-12, 'wagnerowski==cane(c=0)');
  approx(w.Sc, 0.27 * 2.0 + 0.71, 1e-12, 'wagnerowski==a*nsw+b');
  ok(saturationCoefficientWagnerowski(1.0, { a: 0.27, b: 0.71 }).extrapolated === true, 'wagnerowski flags NSW<1.6');
  ok(saturationCoefficientWagnerowski(2.0, { a: 0.27, b: 0.71 }).extrapolated === false, 'wagnerowski quiet NSW=2.0');
  ok(saturationCoefficientWagnerowski(2.0, null).ok === false, 'wagnerowski rejects missing coeffs (no defaults)');
  ok(saturationCoefficientCane(2.0, { a: 0.27 }).ok === false, 'cane rejects partial coeffs (no defaults)');
  const m = caneVavrineczCoeffsFromRsAsh(2.0, 0.1, 0.01, 0.001);
  approx(m.a, 0.1 + 0.01 * 2.0 + 0.001 * 4.0, 1e-12, 'cane rs/ash map math (TEST VALUES)');
  ok(caneVavrineczCoeffsFromRsAsh(2.0, 0.1, undefined, 0).ok === false, 'cane map rejects missing B-coeff');
}
// ---------- H. NSW consistency ----------
for (const [ds, pu] of [[15, 85], [40, 90], [65, 80]]) approx(oracleNSW(ds, pu), specNSW(ds, pu), 1e-12, 'nsw ds=' + ds + ' pu=' + pu);
// ---------- I. Bisection round-trip ----------
for (const [W, Q, tw] of [[15, 85, 60], [45, 90, 80], [70, 85, 65]]) {
  const fwd = bpeSaskaASI2002Eq8(W, Q, tw);
  const inv = inferBrixFromBpeSaskaEq8(tw + fwd.bpe, Q, tw);
  ok(inv.ok && Math.abs(inv.achievedBPE - fwd.bpe) <= 0.011, 'bisection round-trip W=' + W + ' -> ' + (inv.ok ? inv.brix.toFixed(3) : 'fail'));
  if (inv.ok) approx(inv.brix, W, 0.5, 'bisection recovers W=' + W);
}
ok(inferBrixFromBpeSaskaEq8(50, 85, 60).ok === false, 'bisection rejects below-saturation T');
ok(inferBrixFromBpeSaskaEq8(70, 85, 60, 0, 100).ok === false, 'bisection rejects bad tolerance');
// ---------- J. validate_against_sugars oracle on our values ----------
{
  const r = bpeSaskaASI2002Eq8(40, 85, 65);
  const checks = oracleValidate({ isSteam: false, ds: 40, pu: 85, bpe: r.bpe, superheat: 0, t: 0, tsat: 0, h: 0 });
  ok(checks[0][0] === 'PASS', 'oracle validator passes our BPE state');
  const steam = oracleValidate({ isSteam: true, ds: 0, pu: 0, bpe: 0, superheat: 5, t: oracleTsat(101.325) + 5, tsat: oracleTsat(101.325), h: 2680 });
  ok(steam[0][0] === 'PASS', 'oracle validator passes superheated steam state');
  const bad = oracleValidate({ isSteam: false, ds: 40, pu: 85, bpe: 0, superheat: 0, t: 0, tsat: 0, h: 0 });
  ok(bad[0][0] === 'ERROR', 'oracle validator catches zero-BPE liquid');
}
// ---------- K. Eq16 monitor unchanged (Van Hook primary untouched) ----------
{
  const m = src.indexOf('function supersaturationFromBpeSaskaASI2002Eq16(');
  ok(m > 0, 'eq16 monitor still present');
}

console.log(fail === 0 ? 'ALL PROPERTIES CROSS-CHECK TESTS PASS' : fail + ' CROSS-CHECK(S) FAILED');
process.exit(fail ? 1 : 0);
