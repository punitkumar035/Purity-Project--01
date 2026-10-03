// Harness Phase-8: solver-plumbing hardening — streams live view, intent defaults.
const fs = require('fs');
const SRC = require('path').join(__dirname, '..', 'js', 'main.js');
const src = fs.readFileSync(SRC, 'utf8');
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
  const body = src.slice(a, (starts.length ? starts[0] : src.length)).replace(/\s+$/, '');
  if (!body.endsWith('}')) throw new Error('bad span: ' + name);
  return body;
}
// drawing-layer lookups (ambient, stubbed exactly as Phase-5)
function connectorEndpointIsPort(e) { return !!(e && e.type === 'port'); }
function portDefForEndpoint(e) {
  const id = e && e.port_id;
  return { dir: (id && String(id).slice(0, 3) === 'out') ? 'out' : 'in' };
}
const state = { unitSystem: 'SI', modelAtmosphericKPa: 101.325, nodes: [], streams: [], connectors: [], pages: [], flows: [] };
const nodeIdMap = {};
const getNode = (id) => nodeIdMap[id] || null;
for (const nm of ['connectorRole', 'connectorSolverActive', 'streamBoundaryType',
  'installStreamsLiveView', 'finalizeConnectorRoleIntent']) eval(needSpan(nm));

let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };
const PT = (station_id, port_id) => ({ type: 'port', station_id, port_id });
const EXT = { type: 'point' };
const mkC = (id, source, target, intent) => ({
  id, source, target,
  properties: intent === undefined ? {} : { boundary_intent: intent }
});

// 1. fresh boot: streams is a LIVE view — connectors added after install appear
{
  const fresh = { connectors: [] };
  installStreamsLiveView(fresh);
  ok(Array.isArray(fresh.streams) && fresh.streams.length === 0, 'live view starts empty');
  fresh.connectors.push(mkC('c1', EXT, PT('E1', 'in0'), 'EXTERNAL'));
  ok(fresh.streams.length === 1 && fresh.streams[0].id === 'c1', 'post-install connector visible via streams (no solver blindness)');
  fresh.connectors.push(mkC('c2', EXT, PT('E1', 'in1')));
  ok(fresh.streams.length === 1, 'intent-less point stub stays out of solver view until glued with intent');
}
// 2. link halves never enter the solver view
{
  const fresh = { connectors: [] };
  installStreamsLiveView(fresh);
  fresh.connectors.push({ id: 'h', linkHalf: true, source: EXT, target: PT('E1', 'in0'), properties: {} });
  ok(fresh.streams.length === 0, 'linkHalf excluded from solver view');
}
// 3. glue-time intent assignment (finalizeConnectorRoleIntent)
{
  const a = mkC('a', EXT, PT('E1', 'in0'));
  finalizeConnectorRoleIntent(a);
  ok(a.properties.boundary_intent === 'EXTERNAL' && connectorRole(a) === 'EXTERNAL_IN', 'mixed point/port glues as EXTERNAL_IN');
  const b = mkC('b', PT('E1', 'out0'), PT('E2', 'in0'));
  finalizeConnectorRoleIntent(b);
  ok(b.properties.boundary_intent === 'AUTO' && connectorRole(b) === 'INTERNAL', 'port/port glues as INTERNAL');
  const c = mkC('c', EXT, { type: 'point' });
  finalizeConnectorRoleIntent(c);
  ok(c.properties.boundary_intent === 'DRAWING' && connectorRole(c) === 'UNCONNECTED', 'point/point stays drawing-only');
}
// 4. no stray state.streams assignments (setter-trap guard)
{
  const assigns = [...src.matchAll(/^\s*state\.streams\s*=/gm)].map(m => m[0].trim());
  ok(assigns.length === 0, 'no direct state.streams assignments (found ' + assigns.length + ')');
}
console.log(fail === 0 ? 'ALL EVAP PHASE8 TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
