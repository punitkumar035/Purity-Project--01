// Harness Phase-6: evaporator property-window corrections (logic + source asserts).
const fs = require('fs');
const SRC = require('path').join(__dirname, '..', 'js', 'main.js');
const src = fs.readFileSync(SRC, 'utf8');
const slice = (a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b);
  if (i < 0 || j < 0 || j <= i) throw new Error('marker missing: ' + a.slice(0, 40));
  return src.slice(i, j);
};
function need(name) {
  const a = src.indexOf('function ' + name + '(');
  if (a < 0) throw new Error('function missing: ' + name);
  const o = src.indexOf('{', a);
  let d = 0, inStr = null, j = o;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '{') d++;
    if (ch === '}') { d--; if (d === 0) break; }
  }
  return src.slice(a, j + 1);
}
const state = { unitSystem: 'SI', modelAtmosphericKPa: 101.325, name: 'Test Model', nodes: [], streams: [] };
const nodeIdMap = {};
const getNode = (id) => nodeIdMap[id] || null;
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function modelPatmKPa() { const v = Number(state.modelAtmosphericKPa); return (Number.isFinite(v) && v > 0) ? v : 101.325; }

eval(slice('function p2num(v){', 'function p2clamp'));
eval(slice('const IAPWS4 = {', '// IAPWS-IF97 common service'));
eval(slice('const IF97_R=0.461526;', 'function waterSteamStateFromStream(stream){'));
// const-block helpers as var so they leak into harness scope
eval(slice('const EVAP_PRESSURE_UNITS=[', 'function modelUnitSystem').replace(/const /g, 'var '));
eval(slice('const evapDispTempC=', 'function evapOrdinal').replace(/const /g, 'var '));
function need(name) {
  const a = src.indexOf('function ' + name + '(');
  if (a < 0) throw new Error('function missing: ' + name);
  const o = src.indexOf('{', a);
  let d = 0, inStr = null, j = o;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '{') d++;
    if (ch === '}') { d--; if (d === 0) break; }
  }
  return src.slice(a, j + 1);
}
eval(need('modelUnitSystem'));
eval(need('evapPressureToAbsKPa'));
{
  const evIdx = src.indexOf('evaporator: {');
  const open = src.indexOf('{', evIdx + 'evaporator:'.length);
  let d = 0, inStr = null, j = open;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '{') d++;
    if (ch === '}') { d--; if (d === 0) break; }
  }
  globalThis.__nodeDefs = { evaporator: eval('(' + src.slice(open, j + 1) + ')') };
}
const nodeDefs = globalThis.__nodeDefs;
const NEED = ['ensureEvaporatorDefaults', 'evapOrdinal', 'evapFmtPressure', 'evapFmtTempC',
  'evapFmtPct', 'evapFmtDropK', 'evapEffectCount', 'evapEffectOptions', 'evaporatorMultiples', 'evaporatorMultipleOf',
  'evaporatorStationIssues', 'evaporatorDialogVaporTsatC', 'evaporatorTSOwner',
  'evaporatorDisplayStatus', 'evapFillPressurePartner', 'evapAbsKPaToUnit'];
for (const nm of NEED) eval(need(nm));

let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };
const codes = (n, opts) => evaporatorStationIssues(n, opts).map(e => e.id + ':' + (e.sev || 'FATAL'));
const mkEvap = (id, sn, params) => {
  const n = { id, type: 'evaporator', label: 'Evaporator Effect', stationNumber: sn, equipmentTag: 'EVAP-' + String(sn).padStart(4, '0'), params: Object.assign({}, params), stationResult: null };
  nodeIdMap[id] = n; state.nodes.push(n); return n;
};
const reset = () => { state.nodes = []; state.streams = []; for (const k of Object.keys(nodeIdMap)) delete nodeIdMap[k]; };

// 1. defaults: PRESSURE, empty/0.0 pair (W-02)
{
  const d = nodeDefs.evaporator.defaults;
  ok(d.mode === 'PRESSURE', 'default mode is Option B (PRESSURE)');
  ok(d.vaporPressure.value === '0.0' && d.satTemp_C === '0.0', 'default pressure/Tsat empty-0.0 (invalid until edited)');
  ok(src.includes("node.params.stationName=String(node.label||'Evaporator Effect').slice(0,20)"), 'createNode commits default station name (X-01)');
}
// 2b. dropdown entries exactly 1..N (one effect -> one entry)
{
  const countOpts = (html) => (html.match(/<option /g) || []).length;
  const o1 = evapEffectOptions(1, '1');
  ok(countOpts(o1) === 1 && o1.includes('1 - First Effect'), 'N=1 offers exactly one entry');
  const o2 = evapEffectOptions(2, '2');
  ok(countOpts(o2) === 2 && o2.includes('1 - First Effect') && o2.includes('2 - Second Effect'), 'N=2 offers First + Second');
  const o6 = evapEffectOptions(6, '6');
  ok(countOpts(o6) === 6 && o6.includes('6 - Sixth Effect'), 'N=6 offers six entries');
  const o7 = evapEffectOptions(7, '7');
  ok(countOpts(o7) === 7 && o7.includes('7 - 7th Effect'), 'N=7 offers seven entries');
  const oor = evapEffectOptions(2, '5');
  ok(countOpts(oor) === 3 && oor.includes('out of range'), 'stored effectNo above N kept + flagged');
}
// 2. wording + precision (W-10, W-11)
{
  ok(evapOrdinal(1) === '1 - First Effect', 'SUGARS wording effect 1');
  ok(evapOrdinal(6) === '6 - Sixth Effect', 'SUGARS wording effect 6');
  ok(evapOrdinal(7) === '7 - 7th Effect', 'numeric ordinal beyond six');
  ok(evapFmtPressure('169.18', 'kPa') === '169.2', 'pressure 1 decimal');
  ok(evapFmtTempC('115') === '115.0', 'temperature 0.0');
  ok(evapFmtPct('0') === '0.00' && evapFmtPct('5') === '5.00', 'percent 0.00');
  ok(evapFmtDropK('0') === '0.0', 'condensate drop 0.0');
  ok(evapFmtPressure('', 'kPa') === '' && evapFmtTempC('') === '' && evapFmtPct('') === '', 'empty stays empty (no fake 0)');
}
// 3. P-Tsat round trip 169.18 kPa <-> 115.0 C (test 10)
{
  reset();
  const n = mkEvap('e1', 10, { stationName: 'E', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '169.18', unit: 'kPa' }, satTemp_C: '' });
  const r1 = evapFillPressurePartner(n, 'pressure');
  ok(r1.ok && Math.abs(parseFloat(n.params.satTemp_C) - 115) < 0.15, '169.18 kPa fills Tsat ~115 C (got ' + n.params.satTemp_C + ')');
  n.params.vaporPressure = { value: '', unit: 'kPa' };
  const r2 = evapFillPressurePartner(n, 'satTemp');
  ok(r2.ok && Math.abs(parseFloat(n.params.vaporPressure.value) - 169.18) < 0.15, '115 C fills P ~169.18 kPa (got ' + n.params.vaporPressure.value + ')');
}
// 4. V-11 / V-15 / V-16 / V-17 (tests 2, 5)
{
  reset();
  const a = mkEvap('e1', 10, { stationName: 'E', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '', unit: 'kPa' }, satTemp_C: '' });
  ok(codes(a).includes('V-11:FATAL'), 'both-empty PRESSURE raises V-11');
  const b = mkEvap('e2', 20, { stationName: 'E', mode: 'PRESSURE', effectNo: '2', vaporPressure: { value: '20', unit: 'kPa' }, satTemp_C: '' });
  ok(!codes(b).some(c => c.startsWith('V-11') || c.startsWith('V-05')), 'valid pressure: no V-11/V-05');
  const c = mkEvap('e3', 30, { stationName: 'E', mode: 'HTC', effectNo: '3', htc_W_m2K: '', heatingSurface_m2: '' });
  ok(codes(c).includes('V-15:FATAL'), 'empty U/A raises V-15');
  const d = mkEvap('e4', 40, { stationName: 'E', mode: 'FLOW_TEMP', effectNo: '4', flowOutTemp_C: '' });
  ok(codes(d).includes('V-16:FATAL'), 'empty flowT raises V-16');
  const e = mkEvap('e5', 50, { stationName: 'E', mode: 'FLOW_TEMP', effectNo: '5', flowOutTemp_C: '50', vaporPressure: { value: '60', unit: 'kPa' }, satTemp_C: '' });
  ok(codes(e).includes('V-16:FATAL') && !codes(e).some(x => x.startsWith('V-06')), 'flowT below vapor Tsat raises V-16 only');
  const g = mkEvap('e6', 60, { stationName: 'E', mode: 'PRESSURE', effectNo: '6', vaporPressure: { value: '20', unit: 'kPa' } });
  g.equipmentTag = 'TOO-LONG-TAG!';
  ok(codes(g).includes('V-17:FATAL'), '13-char tag raises V-17');
  g.equipmentTag = 'EVAP-0060';
  ok(!codes(g).some(x => x.startsWith('V-17')), '9-char tag passes V-17');
}
// 5. V-12 / V-13 / V-14 severities
{
  reset();
  mkEvap('e1', 10, { stationName: 'A', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '60', unit: 'kPa' }, satTemp_C: '' });
  mkEvap('e2', 20, { stationName: 'B', mode: 'PRESSURE', effectNo: '2', vaporPressure: { value: '60', unit: 'kPa' }, satTemp_C: '' });
  const w = codes(nodeIdMap.e1).filter(c => c.startsWith('V-12'));
  ok(w.length === 1 && w[0] === 'V-12:WARN', 'equal pressures warn V-12 (test 3)');
  nodeIdMap.e2.params.vaporPressure = { value: '25', unit: 'kPa' };
  ok(!codes(nodeIdMap.e1).some(c => c.startsWith('V-12')), 'descending pressures: no V-12');
  nodeIdMap.e1.stationResult = { ok: true, DT_K: 1.5 };
  ok(codes(nodeIdMap.e1).includes('V-13:WARN'), 'DT below 2 K warns V-13');
  nodeIdMap.e1.stationResult = { ok: true, DT_K: 5 };
  ok(!codes(nodeIdMap.e1).some(c => c.startsWith('V-13')), 'DT 5 K: no V-13');
  nodeIdMap.e2.params.totalSolidsPct = '45';
  const info = evaporatorStationIssues(nodeIdMap.e1).find(e => e.id === 'V-14');
  ok(info && info.sev === 'INFO' && info.message.includes('#20'), 'V-14 info names owner station');
}
// 6. TS ownership lock (test 6)
{
  reset();
  const a = mkEvap('e1', 10, { stationName: 'A', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '60', unit: 'kPa' } });
  const b = mkEvap('e2', 20, { stationName: 'B', mode: 'PRESSURE', effectNo: '2', vaporPressure: { value: '40', unit: 'kPa' } });
  const c = mkEvap('e3', 30, { stationName: 'C', mode: 'PRESSURE', effectNo: '3', vaporPressure: { value: '25', unit: 'kPa' }, totalSolidsPct: '65' });
  const oa = evaporatorTSOwner(a), ob = evaporatorTSOwner(b), oc = evaporatorTSOwner(c);
  ok(oa.locked && oa.owner.id === 'e3', 'effect 1 locked by effect 3 owner');
  ok(ob.locked && ob.owner.id === 'e3', 'effect 2 locked by effect 3 owner');
  ok(oc.isOwner && !oc.locked, 'effect 3 owns');
}
// 7. status states (test 7: TS owner exempts effect-1 steam)
{
  reset();
  const a = mkEvap('e1', 10, { stationName: '', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '', unit: 'kPa' }, satTemp_C: '' });
  ok(evaporatorDisplayStatus(a).state === 'UNSPECIFIED', 'fresh invalid spec -> UNSPECIFIED (not WAITING)');
  a.params.stationName = 'A'; a.params.vaporPressure = { value: '60', unit: 'kPa' };
  ok(evaporatorDisplayStatus(a).state === 'WAITING_INPUT', 'valid spec, unconnected -> WAITING_INPUT');
  state.streams = [{ toNodeId: 'e1', toPortId: 'in0', props: { flow: '100000' } }, { toNodeId: 'e1', toPortId: 'in1', props: {} }];
  ok(evaporatorDisplayStatus(a).state === 'WAITING_INPUT', 'empty steam, no owner -> WAITING_INPUT');
  const b = mkEvap('e2', 20, { stationName: 'B', mode: 'PRESSURE', effectNo: '2', vaporPressure: { value: '25', unit: 'kPa' }, totalSolidsPct: '45' });
  ok(evaporatorDisplayStatus(a).state === 'READY', 'owner present: empty effect-1 steam is not WAITING');
  a.stationResult = { ok: true };
  ok(evaporatorDisplayStatus(a).state === 'SOLVED', 'solved -> SOLVED');
  a.stationResult = { ok: false, messages: ['boom'] };
  ok(evaporatorDisplayStatus(a).state === 'ERROR', 'failed balance -> ERROR');
}
// 8. dialog scope excludes V-08; pre-flight keeps it (X-04)
{
  reset();
  mkEvap('e1', 10, { stationName: 'A', mode: 'PRESSURE', effectNo: '1', vaporPressure: { value: '60', unit: 'kPa' } });
  state.streams = [];
  ok(!codes(nodeIdMap.e1, { includeTopology: false }).some(c => c.startsWith('V-08')), 'dialog scope: no V-08');
  ok(codes(nodeIdMap.e1).some(c => c.startsWith('V-08')), 'full scope: V-08 present');
}
// 9. source asserts: structure, enable matrix, labels, tabs
{
  const has = (re, msg) => ok(re.test(src), msg);
  has(/id="evapNodeNumber" readonly/, 'station number is read-only (W-01)');
  ok(!/id="evapNodeTag"/.test(src), 'header equipment tag removed (X-02)');
  has(/<label>Equipment ID \(≤11 chars\)<\/label><input id="evapEquipmentId"/, 'single Equipment ID field (W-08/X-02)');
  has(/<button class="sizing-tool-btn" id="evapOpenSizingBtn">Coefficient<\/button>/, 'Coefficient always enabled (W-05)');
  has(/<label>Heating Surface A[\s\S]{0,120}?<\/label><input id="evapSurf" type="number"[^>]*>/, 'Heating Surface outside Option A, never disabled (W-04)');
  ok(/<input id="evapSurf"[^>]*>/.test(src) && !/<input id="evapSurf"[^>]*disabled/.test(src), 'Heating Surface input carries no disabled attribute');
  ok(!/data-evap-page-panel="losses"/.test(src), 'Losses tab panel removed (W-06)');
  ok(!/data-evap-page="losses"/.test(src), 'Losses nav removed (W-06)');
  has(/id="evapTS" type="number"[^>]*\$\{tsOwn\.locked\?'disabled':''\}/, 'TS input with cross-effect lock (§3)');
  has(/\$\{steamInLabel\}/, 'steam/vapor label by effect (X-05)');
  has(/Status: \$\{escapeHtml\(disp\.state\)\}.*Model: \$\{escapeHtml\(state\.name/, 'footer shows one status + model name (W-12, §5)');
  has(/Outlined = Editable process input/, 'legend without red-as-input (W-09)');
  has(/id="evapStatusLine"/, 'footer status line id for live refresh');
  has(/id="evapIssuesBox"/, 'issues box id for live refresh');
  has(/name="evapColorUnit" value="CU"/, 'CU radio kept (W-13)');
  has(/<label>Condensate Drop \(\$\{evapDeltaUnit\(\)\}\)<\/label>/, 'condensate drop label fixed (X-08)');
  has(/Distributor rule: required, specified, overflow/, 'bleed note cites Distributor rule (X-09)');
  ok(!/Option [ABCD]: Heat Transfer Coefficient \(U\)|Option B: Vapour Out|Option D: Pressure Feedback|Option C: Juice Flow Out/.test(src), 'no Option A-D labels in evaporator dialog');
  has(/HTC · MAGENTA/, 'Heat Transfer badge is mode-keyed');
  has(/VAPOR · MAGENTA/, 'Vapor Out badge is mode-keyed');
  has(/FLOW · MAGENTA/, 'Flow Out badge is mode-keyed');
  ok(!/>A · MAGENTA<|>B · D · MAGENTA<|>C · MAGENTA</.test(src), 'letter badges gone');
  // 10. Dialog B (Scn-2): two Calculate buttons, no mode select, compact BPE note
  has(/id="evapSizeCalcU">Calculate HTC<\/button>/, 'Calculate HTC button (Scn-2)');
  has(/id="evapSizeCalcA">Calculate Surface<\/button>/, 'Calculate Surface button (Scn-2)');
  ok(!/id="evapSizeMode"/.test(src), 'mode select removed from evaporator sizing');
  ok(!/id="evapSizeCompute"/.test(src), 'single Calculate button removed');
  has(/Enter Heating Surface to get Heat Transfer Coefficient/, 'Scn-2 hint text');
  has(/BPE extrapolated outside validated range/, 'BPE wall collapsed to one line');
}
console.log(fail === 0 ? 'ALL EVAP PHASE6 TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
