// Harness: evaporator Phase-1 units / P-Tsat / multiples / validation (real code).
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

// IAPWS saturation pair + coeffs
const iapwsStart = src.indexOf('const IAPWS4 = {');
const iapwsEnd = src.indexOf('// IAPWS-IF97 common service');
eval(src.slice(iapwsStart, iapwsEnd));

// nodeDefs evaporator entry
const evIdx = src.indexOf('evaporator: {');
const evSrc = balancedSlice(src, src.indexOf('{', evIdx + 'evaporator:'.length));
const nodeDefs = { evaporator: eval('(' + evSrc + ')') };
const clone = (o) => JSON.parse(JSON.stringify(o));

// ensureEvaporatorDefaults
const eStart = src.indexOf('function ensureEvaporatorDefaults(n){');
const eEnd = src.indexOf('function evaporatorParamHtml(n){');
eval(src.slice(eStart, eEnd));

// units core through openEvapUnitsDialog (function decls leak out of eval;
// const arrow helpers are captured via the returned handle)
const uStart = src.indexOf('const EVAP_PRESSURE_UNITS=[');
const uEnd = src.indexOf('let evapModernActivePage');
const __ev = eval(src.slice(uStart, uEnd) + ';({evapDispTempC,evapStoreTempC,evapTempUnit,evapDispHTC,evapStoreHTC,evapHTCUnit,evapDispArea,evapStoreArea,evapAreaUnit,evapFlowUnit,evapDispFlow,evapDispDeltaK,evapStoreDeltaK,evapDeltaUnit})');
Object.assign(globalThis, __ev);

const state = { unitSystem: 'SI', modelAtmosphericKPa: 101.325, nodes: [], streams: [] };

let fail = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { console.log('FAIL:', msg, 'got', JSON.stringify(a), 'want', JSON.stringify(b)); fail++; }
  else console.log('ok:', msg);
};
const approx = (a, b, tol, msg) => {
  const ok = Number.isFinite(a) && Math.abs(a - b) <= tol;
  if (!ok) { console.log('FAIL:', msg, 'got', a, 'want ~', b); fail++; }
  else console.log('ok:', msg);
};

// --- pressure units (§3.4) ---
eq(evapPressureToAbsKPa('0.5', 'bar'), 50, '0.5 bar -> 50 abs kPa');
approx(satTempCFromKPa(50), 81.3, 0.1, '0.5 bar -> 81.3 C (HB test)');
approx(satPressureKPaFromC(85), 57.9, 0.1, '85 C -> 57.9 kPa (HB test)');
approx(evapPressureToAbsKPa('-700', 'mm Hg'), 101.325 - 700 * 0.133322, 1e-9, 'negative mmHg gauge below atm');
approx(evapAbsKPaToUnit(50, 'bar'), 0.5, 1e-12, 'abs->bar round trip');
approx(evapAbsKPaToUnit(evapPressureToAbsKPa('-75.4', 'mm Hg'), 'mm Hg'), -75.4, 1e-9, 'mmHg round trip');
approx(evapAbsKPaToUnit(evapPressureToAbsKPa('10', 'in Hg'), 'in Hg'), 10, 1e-9, 'inHg round trip');
eq(evapPressureToAbsKPa('', 'kPa'), 0, 'blank pressure -> 0 (caught by V-05/fill guards)');

// --- SI/US display (§3.1) ---
state.unitSystem = 'US';
eq(evapDispTempC('100'), 212, '100C -> 212F');
eq(evapStoreTempC('212'), 100, '212F -> 100C store');
approx(evapDispHTC('1000'), 176.110, 1e-3, 'HTC to BTU');
approx(evapStoreHTC(evapDispHTC('1850')), 1850, 1e-9, 'HTC round trip');
approx(evapDispArea('10'), 107.639, 1e-3, 'm2 to ft2');
approx(evapStoreArea(evapDispArea('2000')), 2000, 1e-9, 'area round trip');
approx(evapDispDeltaK('2'), 3.6, 1e-12, 'delta K to dF');
state.unitSystem = 'SI';
eq(evapDispTempC('100'), 100, 'SI identity temp');
eq(evapHTCUnit(), 'W/(m²·K)', 'SI HTC label');

// --- ordinals + effect count (3.5b; W-10 SUGARS wording) ---
eq(evapOrdinal(1), '1 - First Effect', 'ordinal 1');
eq(evapOrdinal(2), '2 - Second Effect', 'ordinal 2');
eq(evapOrdinal(3), '3 - Third Effect', 'ordinal 3');
eq(evapOrdinal(4), '4 - Fourth Effect', 'ordinal 4');
eq(evapOrdinal(11), '11 - 11th Effect', 'ordinal teen');
eq(evapOrdinal(21), '21 - 21st Effect', 'ordinal 21');
state.nodes = [];
eq(evapEffectCount(), 1, 'count floors at 1');
state.nodes = [{ type: 'evaporator' }, { type: 'evaporator' }, { type: 'pan' }, { type: 'evaporator' }];
eq(evapEffectCount(), 3, 'counts evaporator stencils only');

// --- multiples (3.5a) ---
const MN = (st, no) => ({ id: 'n' + st + '_' + no, type: 'evaporator', stationNumber: st, params: { effectNo: String(no) } });
let runs = evaporatorMultiples([MN(100, 1), MN(110, 2), MN(200, 1)]);
eq(runs.length, 2, 'two multiples');
eq(runs[0].broken, false, '1,2 run clean');
eq(runs[1].members.length, 1, 'second multiple single');
runs = evaporatorMultiples([MN(100, 1), MN(110, 1)]);
eq(runs.length, 2, 'two leading 1s are two legal multiples');
eq(runs[0].broken || runs[1].broken, false, 'no false repeat flag');
runs = evaporatorMultiples([MN(100, 1), MN(110, 2), MN(120, 2)]);
eq(runs[0].broken, true, 'in-run repeat flagged');
runs = evaporatorMultiples([MN(100, 1), MN(110, 3)]);
eq(runs[0].broken, true, 'skip flagged');
runs = evaporatorMultiples([MN(100, 2)]);
eq(runs[0].broken, true, 'lone effect 2 flagged');

// --- validation V-codes ---
const baseStreams = [
  { toNodeId: 'e1', toPortId: 'in0' }, { toNodeId: 'e1', toPortId: 'in1' },
  { fromNodeId: 'e1', fromPortId: 'out0' },
  { fromNodeId: 'e1', fromPortId: 'out1', quantityMode: 'KNOWN' },
  { fromNodeId: 'e1', fromPortId: 'out2', quantityMode: 'KNOWN' }
];
const mkEvap = (params) => ({ id: 'e1', type: 'evaporator', stationNumber: 10, params });
const codes = (n) => evaporatorStationIssues(n).map(e => e.id).sort();
state.nodes = [mkEvap({ stationName: 'EV1', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '20', unit: 'kPa' }, satTemp_C: '', totalSolidsPct: '0.00' })];
state.streams = baseStreams;
eq(codes(state.nodes[0]), [], 'valid PRESSURE body: no issues');
state.nodes = [mkEvap({ stationName: '', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '0.0', unit: 'kPa' }, satTemp_C: '' })];
eq(codes(state.nodes[0]).filter(c => c === 'V-01' || c === 'V-05'), ['V-01', 'V-05'], 'V-01 + V-05 on defaults');
state.nodes = [mkEvap({ stationName: 'E', mode: 'HTC', effectNo: '1', htc_W_m2K: '', heatingSurface_m2: '' })];
eq(codes(state.nodes[0]).filter(c => c === 'V-04'), ['V-04', 'V-04'], 'V-04 without U/A (one per field)');
state.nodes = [mkEvap({ stationName: 'E', mode: 'FLOW_TEMP', effectNo: '1', flowOutTemp_C: '' })];
eq(codes(state.nodes[0]).filter(c => c === 'V-06'), ['V-06'], 'V-06 without Tout');
state.nodes = [
  mkEvap({ stationName: 'A', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '20', unit: 'kPa' }, totalSolidsPct: '60' }),
  Object.assign(mkEvap({ stationName: 'B', mode: 'PRESSURE', effectNo: '2', vaporPressure: { value: '15', unit: 'kPa' }, totalSolidsPct: '65' }), { id: 'e2', stationNumber: 20 })
];
state.nodes[0].id = 'e1';
eq(codes(state.nodes[1]).filter(c => c === 'V-07'), ['V-07'], 'V-07 second Total Solids');
state.nodes = [mkEvap({ stationName: 'E', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '20', unit: 'kPa' } })];
state.nodes[0].id = 'e1';
state.streams = baseStreams.map(s => ({ ...s }));
state.streams.find(s => s.fromPortId === 'out1').quantityMode = 'REQUIRED';
eq(codes(state.nodes[0]).filter(c => c === 'V-09'), ['V-09'], 'V-09 out1 required');
state.streams = [];
eq(codes(state.nodes[0]).filter(c => c === 'V-08'), ['V-08'], 'V-08 missing connections');
state.nodes = [mkEvap({ stationName: 'E', mode: 'PRESSURE', effectNo: '5', vaporPressure: { value: '20', unit: 'kPa' } })];
state.nodes[0].id = 'e1';
eq(codes(state.nodes[0]).includes('V-03'), true, 'V-03 out-of-range effectNo');

// --- linked P<->Tsat fill (3.3a) ---
let n = { type: 'evaporator', params: { mode: 'PRESSURE', vaporPressure: { value: '0.5', unit: 'bar' }, satTemp_C: '' } };
eq(evapFillPressurePartner(n, 'pressure').ok, true, 'fill from pressure ok');
approx(parseFloat(n.params.satTemp_C), 81.3, 0.1, '0.5 bar fills 81.3 C');
n = { type: 'evaporator', params: { mode: 'PRESSURE', vaporPressure: { value: '', unit: 'kPa' }, satTemp_C: '85' } };
eq(evapFillPressurePartner(n, 'satTemp').ok, true, 'fill from satTemp ok');
approx(parseFloat(n.params.vaporPressure.value), 57.9, 0.1, '85 C fills 57.9 kPa');
eq(n.params.vaporPressure.unit, 'kPa', 'fill keeps display unit');
n = { type: 'evaporator', params: { mode: 'PRESSURE', vaporPressure: { value: '0', unit: 'kPa' }, satTemp_C: '' } };
eq(evapFillPressurePartner(n, 'pressure').ok, false, 'zero pressure rejected');
n = { type: 'evaporator', params: { mode: 'PRESSURE', vaporPressure: { value: '23000', unit: 'kPa' }, satTemp_C: '' } };
eq(evapFillPressurePartner(n, 'pressure').ok, false, 'above critical rejected');
n = { type: 'evaporator', params: { mode: 'PRESSURE', vaporPressure: { value: '', unit: 'kPa' }, satTemp_C: '' } };
eq(evapFillPressurePartner(n, 'satTemp').ok, false, 'blank satTemp rejected');

console.log(fail === 0 ? 'ALL EVAP PHASE1 TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
