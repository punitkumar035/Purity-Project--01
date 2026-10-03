// Harness: evaporator Phase-3 solver core (real extracted code).
const fs = require('fs');
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
  if (i < 0 || j < 0 || j <= i) throw new Error('marker missing: ' + a.slice(0, 40));
  return src.slice(i, j);
};

const state = { unitSystem: 'SI', modelAtmosphericKPa: 101.325, nodes: [], streams: [] };
const clone = (o) => JSON.parse(JSON.stringify(o));
const nodeIdMap = {};
const getNode = (id) => nodeIdMap[id] || null;
function modelPatmKPa() { const v = Number(state.modelAtmosphericKPa); return (Number.isFinite(v) && v > 0) ? v : 101.325; }

eval(slice('function p2num(v){', 'function p2clamp'));
eval(slice('const IAPWS4 = {', '// IAPWS-IF97 common service'));
eval(slice('const IF97_R=0.461526;', 'function waterSteamStateFromStream(stream){'));
eval(slice('function centHelpbookSyrupCpKJkgK', 'function centHelpbookSyrupEnthalpy0C'));
eval(slice('function bpeSaskaASI2002Eq8(', 'function criticalSupersaturationSaska2002Eq17('));
// nodeDefs evaporator entry for ensure()
{
  const evIdx = src.indexOf('evaporator: {');
  const evSrc = balancedSlice(src, src.indexOf('{', evIdx + 'evaporator:'.length));
  globalThis.__nodeDefs = { evaporator: eval('(' + evSrc + ')') };
}
const nodeDefs = globalThis.__nodeDefs;
eval(slice('function ensureEvaporatorDefaults(n){', 'function evaporatorParamHtml(n){'));
eval(slice('function evapIllinoisRoot', 'function solveEvaporatorStation(n){'));
eval(slice('const EVAP_PRESSURE_UNITS=[', 'let evapModernActivePage'));

let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };
const approx = (a, b, tol, msg) => {
  const good = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
  if (!good) { console.log('FAIL:', msg, 'got', a, 'want ~', b); fail++; }
  else console.log('ok:', msg);
};

// ---------- numerics ----------
{
  const r = evapIllinoisRoot(x => x * x - 2, 1, 2, 1e-12, 100);
  approx(r.root, Math.SQRT2, 1e-10, 'illinois sqrt(2)');
  ok(r.ok && r.iterations > 0, 'illinois reports iterations');
  ok(evapIllinoisRoot(x => 5, 0, 1).ok === false, 'illinois unbracketed fails');
  ok(evapIllinoisRoot(x => x - 3, 0, 5).root === 3, 'illinois linear');
  const s = evapSecant(x => 2 * x - 6, 0, 5, 1e-12, 50);
  approx(s.root, 3, 1e-9, 'secant linear');
  ok(evapSecant(() => 5, 0, 1).ok === false, 'secant flat fails');
}
// ---------- Dialog B §6.4 vector (pure arithmetic of U=H/(A·DT)) ----------
{
  const Q_W = 171999199 * 1000 / 3600;
  approx(Q_W / (3000.0 * 8.2), 1942.2, 0.5, 'A=3000 -> U=1942.2');
  approx(Q_W / (2095.8 * 8.2), 2780, 5, 'U=2095.8 -> A~=2780');
}
// ---------- bodyBalance: PRESSURE + Total Solids (legacy-continuity path) ----------
const FEED_CM = { water: 8500, sucrose: 1275, invert: 100, ash: 25, ns1: 50, ns2: 50, crystals: 0, caco3: 0, cao: 0, fiber: 0, steamVapour: 0, ethanolL: 0, ethanolG: 0, co2: 0, ammonia: 0 };
function mkFeed(crystals) {
  const cm = { ...FEED_CM, water: FEED_CM.water - (crystals || 0), crystals: crystals || 0 };
  return { M: 10000, bx: 15, pur: 85, T: 70, cm, color: '' };
}
function mkSteam(M) {
  const pKPa = 150, ss = if97SaturationAtPressure(pKPa);
  return { M, pKPa, hIn: ss.hg_kJkg, TsatIn: ss.tC };
}
const V20 = { Tsat: satTempCFromKPa(20), pVap: 20 };
const Pbase = { mode: 'PRESSURE', U: null, A: null, loss: 0.015, subK: 0, ts: 65, flowT: null, entrPPM: 0, colorRise: { value: '0', unit: '%' } };
{
  const B = evaporatorBodyBalance(mkFeed(0), mkSteam(null), V20, { ...Pbase });
  ok(B.ok, 'PRESSURE+TS solves');
  approx(B.M_syrup, 1500 / 0.65, 1e-6, 'syrup from TS mass balance');
  approx(B.M_vap, 10000 - 1500 / 0.65, 1e-6, 'vapor closes mass');
  approx(B.DS_out, 65, 1e-9, 'DS equals target');
  approx(B.T_out, V20.Tsat + B.BPE, 1e-9, 'T = Tsat + BPE');
  ok(B.M_steam > 0, 'steam computed, kg/h = ' + B.M_steam.toFixed(1));
  const econ = B.M_vap / B.M_steam;
  ok(econ > 0.5 && econ < 1.0, `steam economy sane (${econ.toFixed(3)})`);
  approx(B.H.net, B.M_steam * (B.M_steam > 0 ? (B.H.gross / B.M_steam) : 0) - B.H.loss, 1e-6, 'heat ledger identity');
  ok(B.H.net > 0 && B.DT_K > 0, 'positive duty and driving DT');
  const sumM = o => Object.values(o || {}).reduce((s, v) => s + (+v || 0), 0);
  ok(Math.abs((10000 + B.M_steam) - (sumM(B.syrupMasses) + sumM(B.vaporMasses) + B.M_steam)) < 1e-6, 'ledger wet-mass closure');
  ok(B.colorOut === '', 'blank feed colour stays blank');
  ok(B.ml.SSml === null || Number.isFinite(B.ml.SSml), 'ML supersaturation computed or null');
}
// ---------- crystals pass through + entrainment ----------
{
  const B = evaporatorBodyBalance(mkFeed(200), mkSteam(null), V20, { ...Pbase, entrPPM: 100 });
  ok(B.ok, 'solves with crystals + entrainment');
  approx(B.syrupMasses.crystals, 200, 1e-9, 'crystals pass through (no growth)');
  ok(B.entr.sucLoss > 0 && B.entr.dropM > 0, `entrainment active (suc ${B.entr.sucLoss.toFixed(2)} kg/h)`);
  approx(B.entr.sucLoss, 100 / 1e6 * B.M_vap, 1e-9, 'sucrose loss = ppm x vapor');
  const sumM2 = o => Object.values(o || {}).reduce((s, v) => s + (+v || 0), 0);
  ok(Math.abs((10000 + B.M_steam) - (sumM2(B.syrupMasses) + sumM2(B.vaporMasses) + B.M_steam)) < 1e-6, 'closure holds with mist');
// droplet mist is crystal-free liquid: on crystal-free juice its removal leaves DS exact
{
  const Bc = evaporatorBodyBalance(mkFeed(0), mkSteam(null), V20, { ...Pbase, entrPPM: 100 });
  ok(Bc.ok, 'clean-juice entrainment solves');
  const sSum = sumM2(Bc.syrupMasses), sWat = Bc.syrupMasses.water;
  ok(Math.abs((sSum - sWat) / sSum * 100 - 65) < 1e-6, 'droplet removal preserves syrup DS exactly');
}
}
// ---------- color rise ----------
{
  const F = mkFeed(0); F.color = '100';
  const B = evaporatorBodyBalance(F, mkSteam(null), V20, { ...Pbase, colorRise: { value: '5', unit: '%' } });
  approx(parseFloat(B.colorOut), 105, 1e-9, '% rise multiplies');
  const B2 = evaporatorBodyBalance(F, mkSteam(null), V20, { ...Pbase, colorRise: { value: '10', unit: 'CU' } });
  approx(parseFloat(B2.colorOut), 110, 1e-9, 'CU rise adds');
}
// ---------- FLOW_TEMP + known steam ----------
{
  const B = evaporatorBodyBalance(mkFeed(0), mkSteam(3000), V20, { ...Pbase, mode: 'FLOW_TEMP', flowT: 90, ts: null });
  ok(B.ok, 'FLOW_TEMP solves');
  approx(B.T_out, 90, 1e-9, 'Tout honored');
  ok(B.M_vap > 0 && B.DS_out > 15, 'evaporation + concentration occur');
}
// ---------- HTC paths ----------
{
  const P = { ...Pbase, mode: 'HTC', U: 1850, A: 2000 };
  const B = evaporatorBodyBalance(mkFeed(0), mkSteam(null), V20, P);
  ok(B.ok, 'HTC+TS converges, iterations=' + B.HTCiters);
  ok(B.T_out < 111.37 - 0.01, 'Tout below steam Tsat (heat flows in)');
  ok(B.M_steam > 0, 'HTC steam solved');
  const Ph = { ...Pbase, mode: 'HTC', U: 1850, A: 2000, ts: null };
  const Bk = evaporatorBodyBalance(mkFeed(0), mkSteam(5000), V20, Ph);
  ok(Bk.ok, 'HTC known-steam direct');
  const sat150 = if97SaturationAtPressure(150);
  const QavCheck = (1 - 0.015) * 5000 * (sat150.hg_kJkg - sat150.hf_kJkg);
  approx(1850 * 2000 * (sat150.tC - Bk.T_out) * 3.6, QavCheck, Math.max(1, QavCheck * 1e-6), 'UA heat matches available steam heat');
  // boil-pinned HTC: UA temperature below boiling, cold feed, ample steam
  {
    const F = mkFeed(0); F.M = 2000000; F.T = 55;
    const Pbp = { ...Pbase, mode: 'HTC', U: 1800, A: 100, ts: null };
    const Bb = evaporatorBodyBalance(F, mkSteam(200000), V20, Pbp);
    ok(Bb.ok && Bb.boilPinned && !Bb.steamStarved && !Bb.flashed, 'HTC boil-pinned solves with cold feed');
    ok(Bb.M_vap > 0, 'boil-pinned evaporates, Mvap=' + (Bb.ok ? Bb.M_vap.toFixed(0) : '?'));
  }
  // genuinely starved: heat cannot reach boiling -> clamp to 0
  {
    const F = mkFeed(0); F.M = 2000000; F.T = 55;
    const Ps = { ...Pbase, mode: 'HTC', U: 1800, A: 100, ts: null };
    const Bs = evaporatorBodyBalance(F, mkSteam(16000), V20, Ps);
    ok(Bs.ok && Bs.steamStarved && Bs.M_vap === 0, 'HTC starved clamps to zero');
  }
  // flashing feed: hot inlet sustains boiling without surface heat
  {
    const F = mkFeed(0); F.M = 100000; F.T = 105;
    const Pf = { ...Pbase, mode: 'HTC', U: 1800, A: 90, ts: null };
    const Bf = evaporatorBodyBalance(F, mkSteam(15000), V20, Pf);
    ok(Bf.ok && Bf.flashed && Bf.M_vap > 0, 'HTC hot feed flashes');
  }
}
// ---------- clean failures ----------
{
  const r1 = evaporatorBodyBalance(mkFeed(0), mkSteam(null), V20, { ...Pbase, ts: 99 });
  ok(!r1.ok && /V-10|95/.test(r1.message), 'TS 99 fails');
  const r2 = evaporatorBodyBalance(mkFeed(0), mkSteam(null), V20, { ...Pbase, ts: 10 });
  ok(!r2.ok, 'TS below feed brix fails');
  const r3 = evaporatorBodyBalance(mkFeed(0), mkSteam(null), V20, { ...Pbase, mode: 'PRESSURE', ts: null });
  ok(!r3.ok && /Total Solids|steam flow/.test(r3.message), 'PRESSURE open balance fails clean');
  const r4 = evaporatorBodyBalance(mkFeed(0), mkSteam(null), V20, { ...Pbase, mode: 'BOGUS', ts: null });
  ok(!r4.ok, 'unknown mode fails');
}
// ---------- vapor Tsat resolver branches ----------
{
  const n = { params: { vaporPressure: { value: '20', unit: 'kPa' } } };
  const r = evaporatorVaporTsat(n, null, 'PRESSURE');
  ok(r.ok && Math.abs(r.Tsat - 60.06) < 0.05, 'PRESSURE object pair');
  const n2 = { params: { vaporPressure: { value: '', unit: 'kPa' }, satTemp_C: '85' } };
  const r2 = evaporatorVaporTsat(n2, null, 'PRESSURE');
  ok(r2.ok && Math.abs(r2.pVap - 57.9) < 0.15, 'PRESSURE satTemp path');
  const outV = { props: { pressureAbs: '', temperature: '' }, toNodeId: 'sink1' };
  nodeIdMap.sink1 = { id: 'sink1', type: 'sink' };
  const r3 = evaporatorVaporTsat({}, outV, 'FEEDBACK');
  ok(r3.ok && Math.abs(r3.pVap - 101.325) < 1e-9, 'FEEDBACK to sink uses Patm');
  const outV2 = { props: { pressureAbs: '', temperature: '' }, toNodeId: 'nope' };
  const r4 = evaporatorVaporTsat({}, outV2, 'FEEDBACK');
  ok(!r4.ok && r4.waiting === true, 'FEEDBACK missing context waits');
}
// ---------- microSolve NO_INLET_STATE + read-only ----------
{
  const before = JSON.stringify({ nodes: state.nodes, streams: state.streams });
  const n = { id: 'mx', type: 'evaporator', params: {} };
  const r = evaporatorMicroSolve(n);
  ok(r.status === 'NO_INLET_STATE', 'micro with no streams -> NO_INLET_STATE');
  ok(JSON.stringify({ nodes: state.nodes, streams: state.streams }) === before, 'micro wrote nothing to the model');
}

console.log(fail === 0 ? 'ALL EVAP PHASE3 TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
