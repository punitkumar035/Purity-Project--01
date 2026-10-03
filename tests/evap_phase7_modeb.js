// Harness Phase-7: Mode-B solve (fixes 0-3) — topology gate, steam derivation,
// genuine TS residual, T-1..T-6/T-8/T-9, INFO exclusion.
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
// index of a function declaration's BODY opening brace (skips the
// parameter list, which may itself contain braces via destructuring)
function bodyBrace(name) {
  const a = src.indexOf('function ' + name + '(');
  if (a < 0) throw new Error('function missing: ' + name);
  const p = src.indexOf('(', a);
  let d = 0, inStr = null, j = p;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '(') d++;
    if (ch === ')') { d--; if (d === 0) break; }
  }
  const o = src.indexOf('{', j);
  return { a, o };
}
// Top-level (2-space indent) function offsets for exact slicing.
const topFns = {};
{
  const re = /^  function ([A-Za-z_$][\w$]*)\(/gm;
  let m;
  while ((m = re.exec(src)) !== null) topFns[m[1]] = m.index;
}
function needSpan(name) {
  const a = topFns[name];
  if (a === undefined) throw new Error('top-level function missing: ' + name);
  const starts = Object.values(topFns).filter(x => x > a).sort((x, y) => x - y);
  const end = starts.length ? starts[0] : src.length;
  const body = src.slice(a, end).replace(/\s+$/, '');
  if (!body.endsWith('}')) throw new Error('bad span: ' + name);
  return body;
}
function needNaive(name) {
  const { a, o } = bodyBrace(name);
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
function need(name) {
  try { return needSpan(name); }
  catch (e) {
    try { return needToken(name); }
    catch (e2) { return needNaive(name); }
  }
}
function needToken(name) {
  const { a, o } = bodyBrace(name);
  let i = o, depth = 0, mode = 'code';
  const tplStack = [];
  while (i < src.length) {
    const ch = src[i], nx = src[i + 1];
    if (mode === 'code') {
      if (ch === '/' && nx === '/') { mode = 'line'; i += 2; continue; }
      if (ch === '/' && nx === '*') { mode = 'block'; i += 2; continue; }
      if (ch === "'") { mode = 'sq'; i++; continue; }
      if (ch === '"') { mode = 'dq'; i++; continue; }
      if (ch === '`') { tplStack.push(depth); mode = 'tpl'; i++; continue; }
      if (ch === '{') { depth++; i++; continue; }
      if (ch === '}') {
        depth--;
        if (tplStack.length && depth === tplStack[tplStack.length - 1]) { tplStack.pop(); mode = 'tpl'; i++; continue; }
        if (depth === 0 && !tplStack.length) break;
        i++; continue;
      }
      i++;
    } else if (mode === 'line') {
      if (ch === '\n') mode = 'code';
      i++;
    } else if (mode === 'block') {
      if (ch === '*' && nx === '/') { mode = 'code'; i += 2; } else i++;
    } else if (mode === 'sq' || mode === 'dq') {
      const q = mode === 'sq' ? "'" : '"';
      if (ch === '\\') i += 2;
      else if (ch === q) { mode = 'code'; i++; }
      else i++;
    } else {
      if (ch === '\\') i += 2;
      else if (ch === '`') { tplStack.pop(); mode = 'code'; i++; }
      else if (ch === '$' && nx === '{') { depth++; mode = 'code'; i += 2; }
      else i++;
    }
  }
  if (depth !== 0) throw new Error('unbalanced: ' + name);
  return src.slice(a, i + 1);
}
function connectorEndpointIsPort(e) { return !!(e && e.type === 'port'); }
function portDefForEndpoint(e) {
  const id = e && e.port_id;
  return { dir: (id && String(id).slice(0, 3) === 'out') ? 'out' : 'in' };
}

const state = { unitSystem: 'SI', modelAtmosphericKPa: 101.325, nodes: [], streams: [], connectors: [], pages: [], flows: [] };
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
eval("var EVAP_MODES=['HTC','PRESSURE','FEEDBACK','FLOW_TEMP'];");
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
  'escapeHtml', 'resolveConnectorEndpoint', 'satSteamHf',
  'evapEffectCount', 'evaporatorTopologyReady', 'evaporatorStationIssues',
  'evaporatorDialogVaporTsatC', 'evaporatorTSOwner',
  'applyEvaporatorRequiredInputSemantics', 'applyEvaporatorSteamRequiredSemantics',
  'solverIssue', 'collectSolverDiagnostics'
];
for (const nm of NEED) { try { eval(need(nm)); } catch (e) { console.log('EXTRACT/EVAL FAIL:', nm, '-', e.message); throw e; } }

let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };

// ---------- builders ----------
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
const FEED_CM = { water: 85, sucrose: 12.75, invert: 1.5, ash: 0.25, ns1: 0.25, ns2: 0.25, crystals: 0, caco3: 0, cao: 0, fiber: 0, steamVapour: 0, ethanolL: 0, ethanolG: 0, co2: 0, ammonia: 0 };
const STEAM_CM = { water: 0, sucrose: 0, invert: 0, ash: 0, ns1: 0, ns2: 0, crystals: 0, caco3: 0, cao: 0, fiber: 0, steamVapour: 100, ethanolL: 0, ethanolG: 0, co2: 0, ammonia: 0 };
function reset() {
  state.nodes = []; state.streams = [];
  for (const k of Object.keys(nodeIdMap)) delete nodeIdMap[k];
}
// tsOn: null | 'E1' | 'E2'; steam: null (blank KNOWN) | number (known) | 'REQUIRED'
function buildTwoEffect(tsOn, steam) {
  reset();
  const E1 = mkNode('E1', 'evaporator', 1, { effectNo: '1', mode: 'PRESSURE', vaporPressure: { value: '60', unit: 'kPa' }, heatLossPct: '1' });
  const E2 = mkNode('E2', 'evaporator', 2, { effectNo: '2', mode: 'PRESSURE', vaporPressure: { value: '25', unit: 'kPa' }, heatLossPct: '1' });
  if (tsOn === 'E1') E1.params.totalSolidsPct = '45';
  if (tsOn === 'E2') E2.params.totalSolidsPct = '45';
  const SK = mkNode('SK', 'sink', 3, {});
  mkStream('feed1', EXT, PT('E1', 'in0'), { flow: '100000', brix: '15', purity: '85', temperature: '80', pressureAbs: '101.325' },
    { properties: { boundary_intent: 'EXTERNAL' }, quantityMode: 'KNOWN', solveStatus: 'EXTERNAL_READY', components: Object.assign({}, FEED_CM) });
  const sProps = { pressureAbs: '250', drynessFraction: '1.0', steamStateMode: 'SATURATED' };
  if (typeof steam === 'number') sProps.flow = String(steam);
  mkStream('steam1', EXT, PT('E1', 'in1'), sProps,
    { properties: { boundary_intent: 'EXTERNAL' }, quantityMode: steam === 'REQUIRED' ? 'REQUIRED' : 'KNOWN', solveStatus: steam === 'REQUIRED' ? 'REQUIRED_WAITING_STATION' : '', streamClass: 'thermal', components: Object.assign({}, STEAM_CM) });
  mkStream('syr12', PT('E1', 'out0'), PT('E2', 'in0'), {});
  mkStream('vap12', PT('E1', 'out1'), PT('E2', 'in1'), {});
  mkStream('cond1', PT('E1', 'out2'), PT('SK', 'in'), {});
  mkStream('syr2', PT('E2', 'out0'), PT('SK', 'in'), {});
  mkStream('vap2', PT('E2', 'out1'), PT('SK', 'in'), {});
  mkStream('cond2', PT('E2', 'out2'), PT('SK', 'in'), {});
  state.streams.forEach(installConnectorLegacyAccessors);
  return { E1, E2, SK };
}
const S = (id) => state.streams.find(s => s.id === id);

// ---------- A. topology gate (Fix 0) ----------
{
  const ins = [{ toPortId: 'in0' }, { toPortId: 'in1' }];
  const outs = [{ fromPortId: 'out0' }, { fromPortId: 'out1' }, { fromPortId: 'out2' }];
  ok(evaporatorTopologyReady({}, ins, outs) === true, 'gate: full in0/in1/out0/out1/out2 is topology-ready');
  ok(evaporatorTopologyReady({}, ins.filter(s => s.toPortId === 'in0'), outs) === false, 'gate: missing in1 is not ready');
  ok(evaporatorTopologyReady({}, ins, outs.filter(s => s.fromPortId !== 'out2')) === false, 'gate: missing out2 is not ready');
  ok(evaporatorTopologyReady({}, [{ toPortId: 'steam' }, { toPortId: 'juice' }], outs) === false, 'gate: phantom steam/juice ports never match');
}

// ---------- B. steam derivation (Fix 2) + T-10 existing ----------
{
  buildTwoEffect('E2', null);
  applyEvaporatorSteamRequiredSemantics();
  const st = S('steam1');
  ok(st.quantityMode === 'REQUIRED' && st.autoQuantityRule === 'EVAPORATOR_STEAM_REQUIRED', 'derive: blank effect-1 steam becomes REQUIRED with TS on E2 (T-1 setup)');
  nodeIdMap.E2.params.totalSolidsPct = '0.00';
  applyEvaporatorSteamRequiredSemantics();
  ok(st.quantityMode === 'KNOWN' && !st.autoQuantityRule, 'derive: clearing TS restores KNOWN');
  // user scenario: solve, change last-effect Brix, solve again with no manual erase
  buildTwoEffect('E2', null);
  applyEvaporatorSteamRequiredSemantics();
  const ra = solveEvaporatorStation(nodeIdMap.E1);
  ok(ra.ok, 're-solve setup: first solve ok');
  applyEvaporatorSteamRequiredSemantics();
  ok(S('steam1').quantityMode === 'REQUIRED' && S('steam1').autoQuantityRule === 'EVAPORATOR_STEAM_REQUIRED', 'derive: rule+flow persist across runs (no self-unflagging)');
  nodeIdMap.E2.params.totalSolidsPct = '50';
  const rb = solveEvaporatorStation(nodeIdMap.E1);
  ok(rb.ok && Math.abs(parseFloat(S('syr2').props.brix) - 50) <= 0.02, 're-solve: Brix change re-solves with no manual erase (DS2=' + (rb.ok ? parseFloat(S('syr2').props.brix).toFixed(2) : '?') + ')');
  if (rb.ok) ok(!(rb.messages || []).join(' ').includes('clear the steam quantity'), 're-solve: no T-5 block');
  nodeIdMap.E2.params.totalSolidsPct = '0.00';
  applyEvaporatorSteamRequiredSemantics();
  ok(S('steam1').quantityMode === 'KNOWN' && S('steam1').props.flow === '' && !S('steam1').autoQuantityRule, 'derive: rule removal also blanks the system-owned flow');
  buildTwoEffect('E2', 80000);
  applyEvaporatorSteamRequiredSemantics();
  ok(S('steam1').quantityMode === 'KNOWN' && !S('steam1').autoQuantityRule, 'derive: user-known steam untouched (T-5 setup)');
  buildTwoEffect(null, null);
  applyEvaporatorSteamRequiredSemantics();
  ok(S('steam1').quantityMode === 'KNOWN', 'derive: no TS anywhere leaves steam alone');
  // T-10 existing: syrup-out required -> juice-in required
  buildTwoEffect(null, 80000);
  S('syr2').quantityMode = 'REQUIRED';
  applyEvaporatorRequiredInputSemantics();
  ok(S('feed1').quantityMode === 'REQUIRED', 'T-10: required syrup out makes juice in required');
}

// ---------- C. genuine Mode-B loop end to end (Fix 1), zero manual flagging ----------
{
  buildTwoEffect('E2', null);
  applyEvaporatorSteamRequiredSemantics();
  ok(S('steam1').quantityMode === 'REQUIRED', 'e2e: derivation marks steam REQUIRED pre-solve');
  const r1 = solveEvaporatorStation(nodeIdMap.E1);
  ok(r1.ok && r1.status === 'SOLVED', 'e2e: effect-1 solves via real loop' + (r1.ok ? '' : ' :: ' + (r1.messages || []).join(' | ')));
  if (r1.ok) {
    const s2brix = parseFloat(S('syr2').props.brix);
    console.log('   E1 steam=' + S('steam1').props.flow, 'DS1=' + r1.dsOutPct.toFixed(2), 'DS2=' + s2brix.toFixed(3));
    ok(Math.abs(s2brix - 45) <= 0.02, 'e2e: effect-2 hits TS 45 within tolerance');
    const st1 = parseFloat(S('steam1').props.flow);
    ok(Math.abs(st1 - 15000) > 1 && st1 > 30000 && st1 < 90000, 'e2e: steam is energy-consistent, not the old first guess (got ' + st1.toFixed(0) + ')');
    ok(S('steam1').solveStatus === 'REQUIRED_SOLVED', 'e2e: steam written back REQUIRED_SOLVED');
  }
  // direct re-solve of E2 off written states: no TS-demand mismatch warning now
  const r2 = solveEvaporatorStation(nodeIdMap.E2);
  ok(r2.ok && Math.abs(r2.dsOutPct - 45) < 0.02, 'e2e: effect-2 re-solves directly');
  if (r2.ok) ok(!(r2.messages || []).join(' ').includes('differs from the Total-Solids energy demand'), 'e2e: no steam-vs-TS-demand inconsistency warning');
}
// ---------- D. below-feed TS + T-2..T-5 + infeasible-carrier failure quality ----------
{
  buildTwoEffect('E2', null);
  nodeIdMap.E2.params.totalSolidsPct = '10';
  const rb = solveEvaporatorStation(nodeIdMap.E1);
  ok(!rb.ok && (rb.messages || []).join(' ').includes('must exceed incoming'), 'T-9: TS below feed fails clean (TS_TARGET_BELOW_FEED)');
}
{
  // Carrier can never solve (FLOW_TEMP pinned below vapor Tsat): every trial
  // is NaN, so the loop must fail naming the body — not "residual not finite".
  // Hot feed (100 C) keeps effect 1 bracketed at any steam, so every NaN and
  // the final lastErr come deterministically from the carrier.
  buildTwoEffect('E2', null);
  S('feed1').props.temperature = '100';
  nodeIdMap.E2.params.mode = 'FLOW_TEMP';
  nodeIdMap.E2.params.flowOutTemp_C = '50';
  const r = solveEvaporatorStation(nodeIdMap.E1);
  const msg = (r.messages || []).join(' ');
  ok(!r.ok && msg.includes('V-10'), 'infeasible carrier: V-10 failure');
  ok(msg.includes('no feasible effect-1 steam flow'), 'infeasible carrier: says no feasible steam');
  ok(msg.includes('Total-Solids loop on') && msg.includes('Juice-out temperature'), 'infeasible carrier: names the failing body and cause');
}
{
  // T-2: TS on effect 1 itself -> direct solve, steam calculated
  buildTwoEffect('E1', null);
  const r = solveEvaporatorStation(nodeIdMap.E1);
  ok(r.ok && Math.abs(r.dsOutPct - 45) < 1e-6 && r.steamConsumptionKgH > 0, 'T-2: TS on E1 solves directly, steam calculated');
  // T-3: steam known, no TS -> direct solve, TS is output
  buildTwoEffect(null, 80000);
  const r3 = solveEvaporatorStation(nodeIdMap.E1);
  ok(r3.ok && r3.dsOutPct > 15 && r3.dsOutPct < 95, 'T-3: known steam, no TS solves with TS as output (DS=' + (r3.ok ? r3.dsOutPct.toFixed(1) : '?') + ')');
  // T-4: neither -> error naming both options
  buildTwoEffect(null, null);
  const r4 = solveEvaporatorStation(nodeIdMap.E1);
  ok(!r4.ok && /Total Solids/.test((r4.messages || []).join(' ')) && /steam flow/i.test((r4.messages || []).join(' ')), 'T-4: neither entered names both options');
  // T-5: both entered -> over-specified block
  buildTwoEffect('E2', 80000);
  const r5 = solveEvaporatorStation(nodeIdMap.E1);
  ok(!r5.ok && /clear the steam quantity/.test((r5.messages || []).join(' ')), 'T-5: steam + TS blocks as over-specified');
}

// ---------- E. INFO exclusion from solver diagnostics (Fix 3) ----------
{
  buildTwoEffect('E2', 'REQUIRED');
  const all = evaporatorStationIssues(nodeIdMap.E1).map(e => e.id + ':' + (e.sev || 'FATAL'));
  ok(all.includes('V-14:INFO'), 'window scope still reports V-14 INFO (property context kept)');
  const diag = collectSolverDiagnostics();
  ok(!diag.some(i => /V-14/.test(i.fieldLabel || '') || /V-14/.test(i.message || '')), 'diagnostics: no V-14 item reaches the solve dialog');
  ok(!diag.some(i => i.severity === 'INFO'), 'diagnostics: no INFO severity at all');
}

console.log(fail === 0 ? 'ALL EVAP PHASE7 TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
