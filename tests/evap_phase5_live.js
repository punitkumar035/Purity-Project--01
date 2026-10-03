// Harness Phase-5: drive the REAL solveEvaporatorStation + evaporatorTotalSolidsLoop
// headlessly with stubbed streams (2-effect multiple, TS on effect 2).
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
  if (d !== 0) throw new Error('unbalanced: ' + name);
  return src.slice(a, j + 1);
}
// drawing-layer lookups the solver treats as ambient: stubbed (not solver logic)
function connectorEndpointIsPort(e) { return !!(e && e.type === 'port'); }
function portDefForEndpoint(e) {
  const id = e && e.port_id;
  return { dir: (id && String(id).slice(0, 3) === 'out') ? 'out' : 'in' };
}

const state = { unitSystem: 'SI', modelAtmosphericKPa: 101.325, nodes: [], streams: [] };
const nodeIdMap = {};
const getNode = (id) => nodeIdMap[id] || null;
function modelPatmKPa() { const v = Number(state.modelAtmosphericKPa); return (Number.isFinite(v) && v > 0) ? v : 101.325; }

eval(slice('function p2num(v){', 'function p2clamp'));
eval(slice('const BPE_EVAP_RANGES={', 'function bpeEvaporatorModelFor(').replace('const BPE_EVAP_RANGES', 'var BPE_EVAP_RANGES'));
eval(slice('const IAPWS4 = {', '// IAPWS-IF97 common service'));
eval(slice('const IF97_R=0.461526;', 'function waterSteamStateFromStream(stream){'));
eval(slice('function centHelpbookSyrupCpKJkgK', 'function centHelpbookSyrupEnthalpy0C'));
eval(slice('function bpeSaskaASI2002Eq8(', 'function criticalSupersaturationSaska2002Eq17('));
{
  const evIdx = src.indexOf('evaporator: {');
  const evSrc = balancedSlice(src, src.indexOf('{', evIdx + 'evaporator:'.length));
  globalThis.__nodeDefs = { evaporator: eval('(' + evSrc + ')') };
}
const nodeDefs = globalThis.__nodeDefs;
eval(slice('function ensureEvaporatorDefaults(n){', 'function evaporatorParamHtml(n){'));
eval(slice('function evapIllinoisRoot', 'function solveEvaporatorStation(n){'));
eval(slice('const EVAP_PRESSURE_UNITS=[', 'let evapModernActivePage'));
const NEED = [
  'clone', 'sourceKgHToTPH', 'p2sum', 'p2clamp', 'inputStateResolved', 'streamBoundaryType', 'connectorRole',
  'ensureStreamModel', 'defaultStreamProps', 'defaultComponents', 'outputCategory',
  'syncStationDefinedStreamIdentity', 'installConnectorLegacyAccessors',
  'streamHasSteamVapour', 'steamStateModeForStream', 'syncSteamQualityFromComponents',
  'normalizeSolubilityForStream', 'syncStreamToBoundaryNode',
  'assignStreamComponentsFromMasses', 'reconcileDetailedFractions',
  'calculateUniversalStream', 'isPureWaterPhase', 'evaluateSugarSolutionPropertyPackage',
  'calculateMassecuiteAnalysis', 'waterSteamStateFromStream',
  'evaporatorMultiples', 'evaporatorMultipleOf', 'solveEvaporatorStation',
  'solubilityRequiredForStream', 'propertyState', 'bpeEvaporator',
  'bpeBubnikKadlecTechnical', 'bpeEvaporatorRangeWarning', 'pureSucroseSaturationPct',
  'densityLyle1957PureSucroseEq328', 'if97PT', 'derivedSteamQualityFromComponents',
  'canonicalStationOutputStreamName', 'outputMediumName', 'sourceMediumMeta',
  'escapeHtml', 'resolveConnectorEndpoint', 'satSteamHf'
];
for (const nm of NEED) eval(need(nm));

let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };

// ---------- build flowsheet ----------
function mkNode(id, type, stationNumber, params) {
  const n = { id, type, label: id, stationNumber, params: Object.assign({}, params), solveStatus: '', solverMessage: '' };
  nodeIdMap[id] = n; state.nodes.push(n); return n;
}
function mkStream(id, source, target, props, extra) {
  const s = { id, source, target, props: Object.assign({}, props), properties: { label: id } };
  const ex = extra || {};
  if (ex.properties) Object.assign(s.properties, ex.properties);
  if (ex.streamClass) s.properties.medium_class = ex.streamClass;
  if (ex.mediumType) s.properties.medium_role = ex.mediumType;
  Object.keys(ex).forEach(k => { if (!['properties', 'streamClass', 'mediumType'].includes(k)) s[k] = ex[k]; });
  state.streams.push(s); return s;
}
const PT = (station_id, port_id) => ({ type: 'port', station_id, port_id });
const EXT = { type: 'point' };
const E1 = mkNode('E1', 'evaporator', 1, { effectNo: '1', mode: 'PRESSURE', vaporPressure: { value: '60', unit: 'kPa' }, heatLossPct: '1' });
const E2 = mkNode('E2', 'evaporator', 2, { effectNo: '2', mode: 'PRESSURE', vaporPressure: { value: '25', unit: 'kPa' }, heatLossPct: '1', totalSolidsPct: '45' });
const SK = mkNode('SK', 'sink', 3, {});
const feed1 = mkStream('feed1', EXT, PT('E1', 'in0'), { flow: '100000', brix: '15', purity: '85', temperature: '80', pressureAbs: '101.325' },
  { properties: { boundary_intent: 'EXTERNAL' }, quantityMode: 'KNOWN', solveStatus: 'EXTERNAL_READY',
    components: { water: 85, sucrose: 12.75, invert: 1.5, ash: 0.25, ns1: 0.25, ns2: 0.25, crystals: 0, caco3: 0, cao: 0, fiber: 0, steamVapour: 0, ethanolL: 0, ethanolG: 0, co2: 0, ammonia: 0 } });
const steam1 = mkStream('steam1', EXT, PT('E1', 'in1'), { pressureAbs: '250', drynessFraction: '1.0', steamStateMode: 'SATURATED' },
  { properties: { boundary_intent: 'EXTERNAL' }, quantityMode: 'REQUIRED', solveStatus: 'REQUIRED_WAITING_STATION', streamClass: 'thermal',
    components: { water: 0, sucrose: 0, invert: 0, ash: 0, ns1: 0, ns2: 0, crystals: 0, caco3: 0, cao: 0, fiber: 0, steamVapour: 100, ethanolL: 0, ethanolG: 0, co2: 0, ammonia: 0 } });
const syr12 = mkStream('syr12', PT('E1', 'out0'), PT('E2', 'in0'), {});
const vap12 = mkStream('vap12', PT('E1', 'out1'), PT('E2', 'in1'), {});
const cond1 = mkStream('cond1', PT('E1', 'out2'), PT('SK', 'in'), {});
const syr2 = mkStream('syr2', PT('E2', 'out0'), PT('SK', 'in'), {});
const vap2 = mkStream('vap2', PT('E2', 'out1'), PT('SK', 'in'), {});
const cond2 = mkStream('cond2', PT('E2', 'out2'), PT('SK', 'in'), {});
state.streams.forEach(installConnectorLegacyAccessors);

const r1 = solveEvaporatorStation(E1);
ok(r1.ok && r1.status === 'SOLVED', 'live: effect-1 station solves via real TS loop' + (r1.ok ? '' : ' :: ' + (r1.messages || []).join(' | ')));
if (r1.ok) {
  console.log('   E1: evap=' + r1.evaporationKgH.toFixed(0), 'steam=' + r1.steamConsumptionKgH.toFixed(0),
    'DS1=' + r1.dsOutPct.toFixed(2), 'T1=' + r1.boilingTempC.toFixed(2), 'closure=' + r1.balanceClosure.toExponential(1));
  ok(Math.abs(parseFloat(syr2.props.brix) - 45) < 0.01, 'live: effect-2 syrup hits TS 45 (got ' + syr2.props.brix + ')');
  ok(syr12 === state.streams.find(s => s.toNodeId === 'E2' && s.toPortId === 'in0'), 'live: cascade threads through the shared stream');
  // Mode-B residual is genuine (carrier TS computed, not imposed): the loop
  // converges to the energy-consistent steam, not the first guess.
  ok(Math.abs(parseFloat(steam1.props.flow) - 35918) < 1500 && steam1.quantityMode === 'REQUIRED' && steam1.solveStatus === 'REQUIRED_SOLVED', 'live: effect-1 steam solved as REQUIRED (' + steam1.props.flow + ' kg/h)');
  ok(Math.abs(r1.balanceClosure) < 1e-6, 'live: wrapper closure residual tiny');
  const econ = r1.steamConsumptionKgH > 0 ? (parseFloat(syr2.props.flow) ? (100000 - parseFloat(syr2.props.flow)) / r1.steamConsumptionKgH : NaN) : NaN;
  console.log('   E2 syrup=' + syr2.props.flow, 'brix=' + syr2.props.brix, 'T=' + syr2.props.temperature, 'overall economy=' + (Number.isFinite(econ) ? econ.toFixed(2) : '?'));
}
// downstream station solves directly off the written states (own TS, known cascade steam)
{
  const r2 = solveEvaporatorStation(E2);
  ok(r2.ok && r2.status === 'SOLVED' && Math.abs(r2.dsOutPct - 45) < 1e-6, 'live: effect-2 station solves directly' + (r2.ok ? '' : ' :: ' + (r2.messages || []).join(' | ')));
}
// V-03 negative: non-sequential effect numbers break the multiple
{
  const keep = E2.params.effectNo;
  E2.params.effectNo = '3';
  const rb = solveEvaporatorStation(E1);
  ok(!rb.ok && (rb.messages || []).join(' ').includes('V-03'), 'live: gapped effect numbers rejected (V-03)');
  E2.params.effectNo = keep;
}

console.log(fail === 0 ? 'ALL EVAP PHASE5 TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
