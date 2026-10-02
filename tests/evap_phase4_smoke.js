// Harness: evaporator Phase-4 — 4-effect cascade regression + dryer parity.
const fs = require('fs');
const SRC = require('path').join(__dirname, '..', 'js', 'main.js');
const src = fs.readFileSync(SRC, 'utf8');
const slice = (a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b);
  if (i < 0 || j < 0 || j <= i) throw new Error('marker missing: ' + a.slice(0, 40));
  return src.slice(i, j);
};
const state = { unitSystem: 'SI', modelAtmosphericKPa: 101.325, nodes: [], streams: [] };
eval(slice('function p2num(v){', 'function p2clamp'));
eval(slice('const IAPWS4 = {', '// IAPWS-IF97 common service'));
eval(slice('const IF97_R=0.461526;', 'function waterSteamStateFromStream(stream){'));
eval(slice('function centHelpbookSyrupCpKJkgK', 'function centHelpbookSyrupEnthalpy0C'));
eval(slice('function bpeSaskaASI2002Eq8(', 'function criticalSupersaturationSaska2002Eq17('));
eval(slice('function evapIllinoisRoot', 'function solveEvaporatorStation(n){'));

let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };
const approx = (a, b, tol, msg) => {
  const good = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
  if (!good) { console.log('FAIL:', msg, 'got', a, 'want ~', b); fail++; }
  else console.log('ok:', msg);
};
const sumM = o => Object.values(o || {}).reduce((s, v) => s + (+v || 0), 0);

// ---------- dryer parity: variant is presentation-only ----------
{
  const noVariantBranch = !/shapeVariant|Dryer|dryer/i.test(
    src.slice(src.indexOf('function evaporatorBodyBalance'), src.indexOf('function solveEvaporatorStation(n){'))
  );
  ok(noVariantBranch, 'solver core has no variant branch (dryer parity by construction)');
  const hasDryerOption = /Steam Pulp Dryer/.test(src);
  ok(hasDryerOption, 'Steam Pulp Dryer offered as shape variant');
}

// ---------- 4-effect cascade: HTC throughout, TS on last, bleeds on vapors 1-3 ----------
const PVAPS = [60, 40, 25, 12];
const BLEEDS = [25000, 30000, 20000, 0];
const U = 1800, A = 1500, TS4 = 65;
function feedCm(M, bx, pur) {
  const D = M * bx / 100, suc = D * pur / 100, ns = D - suc;
  return { water: M - D, sucrose: suc, invert: ns * 0.6, ash: ns * 0.1, ns1: ns * 0.2, ns2: ns * 0.1,
    crystals: 0, caco3: 0, cao: 0, fiber: 0, steamVapour: 0, ethanolL: 0, ethanolG: 0, co2: 0, ammonia: 0 };
}
function runCascade(feedM) {
  const p0 = { M: feedM, bx: 15, pur: 85, T: 80 };
  const F1 = { ...p0, cm: feedCm(feedM, 15, 85), color: '' };
  const s150 = if97SaturationAtPressure(250);
  const S1base = { pKPa: 250, hIn: s150.hg_kJkg, TsatIn: s150.tC };
  const Pbase = { mode: 'HTC', U, A, loss: 0.01, subK: 0, ts: null, flowT: null, entrPPM: 0, colorRise: { value: '0', unit: '%' } };
  const V = k => ({ Tsat: satTempCFromKPa(PVAPS[k]), pVap: PVAPS[k] });
  // Mirror of the production loop: the carrier TS is a COMPUTED residual,
  // never imposed (mass-imposed TS makes the residual identically zero).
  const f = (x) => {
    if (!(x > 0)) return NaN;
    let Fk = F1;
    const bals = [];
    for (let k = 0; k < 4; k++) {
      const Sk = k === 0
        ? { ...S1base, M: x }
        : { M: Math.max(0, bals[k - 1].M_vap_out - BLEEDS[k - 1]),
            pKPa: PVAPS[k - 1], hIn: if97SaturationAtPressure(PVAPS[k - 1]).hg_kJkg,
            TsatIn: satTempCFromKPa(PVAPS[k - 1]) };
      if (!(Sk.M > 0)) return NaN;
      const Pk = { ...Pbase, ts: null };
      const Bk = evaporatorBodyBalance(Fk, Sk, V(k), Pk);
      if (!Bk.ok) return NaN;
      bals.push(Bk);
      if (k < 3) {
        Fk = { M: Bk.M_syrup - Bk.entr.dropM, bx: Bk.DS_out, pur: 85, T: Bk.T_out,
          cm: Bk.syrupMasses, color: '' };
      }
    }
    return bals[3].DS_out - TS4;
  };
  // scan for a feasible bracket (chain returns NaN where steam/UA cannot meet TS)
  let x0 = null, x1 = null, f0 = NaN;
  const xa = Math.round(feedM * 0.2 / 10000) * 10000, xb = feedM * 0.9, dx = 5000;
  for (let x = xa; x <= xb; x += dx) {
    const fx = f(x);
    if (!Number.isFinite(fx)) continue;
    if (x0 === null) { x0 = x; f0 = fx; continue; }
    if (fx === 0) { x0 = x1 = x; break; }
    if ((f0 < 0) !== (fx < 0)) { x1 = x; break; }
    x0 = x; f0 = fx;
  }
  if (x0 === null) return { ok: false, message: 'no feasible steam1 in scan range' };
  if (x1 === null) return { ok: false, message: 'no sign change in scan range (f0=' + f0 + ')' };
  const r = x0 === x1 ? { ok: true, root: x0, iterations: 0 } : evapSecant(f, x0, x1, TS4 * 1e-4, 60);
  if (!r.ok) return { ok: false, message: r.message };
  // final pass with solved flows recorded (same no-imposition form as f)
  const F1f = { ...F1 };
  const S1f = { ...S1base, M: r.root };
  const chain = [];
  let Fk = F1f;
  for (let k = 0; k < 4; k++) {
    const Sk = k === 0 ? S1f : {
      M: Math.max(0, chain[k - 1].B.M_vap_out - BLEEDS[k - 1]),
      pKPa: PVAPS[k - 1], hIn: if97SaturationAtPressure(PVAPS[k - 1]).hg_kJkg,
      TsatIn: satTempCFromKPa(PVAPS[k - 1]) };
    const Pk = { ...Pbase, ts: null };
    const Bk = evaporatorBodyBalance(Fk, Sk, V(k), Pk);
    if (!Bk.ok) return { ok: false, message: 'final pass: body ' + (k + 1) + ': ' + Bk.message };
    chain.push({ B: Bk, F: Fk, S: Sk });
    if (k < 3) Fk = { M: Bk.M_syrup - Bk.entr.dropM, bx: Bk.DS_out, pur: 85, T: Bk.T_out, cm: Bk.syrupMasses, color: '' };
  }
  return { ok: true, steam1: r.root, iterations: r.iterations, chain };
}
const R = runCascade(600000);
ok(R.ok, '4-effect TS secant converges, iterations=' + (R.iterations ?? '?') + (R.ok ? ' steam1=' + R.steam1.toFixed(0) : ' :: ' + R.message));
if (R.ok) {
  const C = R.chain;
  ok(C.every(e => e.B.ok), 'all four bodies solved');
  approx(C[3].B.DS_out, TS4, 0.01, 'last effect hits Total Solids');
  ok(C[0].B.DS_out < C[1].B.DS_out && C[1].B.DS_out < C[2].B.DS_out && C[2].B.DS_out < C[3].B.DS_out, 'DS rises monotonically');
  ok(C.every((e, k) => e.B.T_out < (k === 0 ? 127.5 : satTempCFromKPa(PVAPS[k - 1])) - 0.01), 'heat flows downhill everywhere');
  C.forEach((e, k) => {
    const inM = e.F.M + e.S.M;
    const outM = sumM(e.B.syrupMasses) + sumM(e.B.vaporMasses) + e.B.M_steam;
    ok(Math.abs(inM - outM) / inM < 1e-9, `body ${k + 1} ledger closes`);
  });
  // multiple-wide closure: feed1 + steam1 vs syrup4 + vapor4 + bleeds + condensates
  const inTot = 600000 + R.steam1;
  const outTot = sumM(C[3].B.syrupMasses) + sumM(C[3].B.vaporMasses)
    + (25000 + 30000 + 20000) + C.reduce((s, e) => s + e.B.M_steam, 0);
  approx(outTot, inTot, Math.max(1, inTot * 1e-9), 'multiple-wide mass closure');
  const econ = (600000 - (sumM(C[3].B.syrupMasses))) / R.steam1;
  ok(econ > 1.5 && econ < 4.5, `steam economy plausible (${econ.toFixed(2)})`);
  // load float: +10% feed must move juice temps and evaporation, not just scale
  const R2 = runCascade(660000);
  ok(R2.ok, 'retuned model converges at +10% feed' + (R2.ok ? '' : ' :: ' + R2.message));
  if (R.ok) console.log('   base : ' + R.chain.map((e, k) => 'E' + (k + 1) + ':T=' + e.B.T_out.toFixed(1) + ',DS=' + e.B.DS_out.toFixed(1) + ',Mv=' + e.B.M_vap.toFixed(0) + (e.B.boilPinned ? '*' : '')).join(' '));
  if (R2.ok) console.log('   +10% : ' + R2.chain.map((e, k) => 'E' + (k + 1) + ':T=' + e.B.T_out.toFixed(1) + ',DS=' + e.B.DS_out.toFixed(1) + ',Mv=' + e.B.M_vap.toFixed(0) + (e.B.boilPinned ? '*' : '')).join(' '));
  if (R2.ok) {
    const dT = R2.chain.map((e, k) => e.B.T_out - C[k].B.T_out);
    const dV = R2.chain.map((e, k) => e.B.M_vap - C[k].B.M_vap);
    ok(dT.some(x => Math.abs(x) > 0.02) && dV.some(x => Math.abs(x) > 1), 'juice temps + evaporation float with load');
    console.log('   load deltas T:', dT.map(x => x.toFixed(2)).join(', '), ' dVap:', dV.map(x => x.toFixed(0)).join(', '));
  }
}

console.log(fail === 0 ? 'ALL EVAP PHASE4 TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
