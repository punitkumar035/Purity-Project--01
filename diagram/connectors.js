/**
 * diagram/connectors.js — Connector model, endpoint attachment, topology validation.
 *
 * Pure functions operating on connector objects. The connector is the
 * definitive representation of a process stream.
 */

// --- Connector Creation --------------------------------------------------

export function createConnectorObject(source, target, seed = {}) {
  return {
    id: seed.id || generateId('stream'),
    source: { type: 'point', x: source.x, y: source.y },
    target: { type: 'point', x: target.x, y: target.y },
    name: seed.name || generateName(source, target),
    quantityMode: 'MATERIAL_MASS',
    pressureMode: 'ABSOLUTE',
    streamClass: determineStreamClass(source, target),
    mediumType: seed.mediumType || 'Syrup',
    components: cloneDeep(seed.components || defaultComponents()),
    props: cloneDeep(seed.props || {}),
    solubility: cloneDeep(seed.solubility || {}),
    propertyMethods: cloneDeep(seed.propertyMethods || {}),
    params: seed.params || {},
    solver: {
      solveStatus: 'UNSOLVED',
      solverMessage: ''
    },
    requiredPath: [],
    pressurePath: [],
    ...seed
  };
}

export function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function generateId(prefix = 'c') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}_${ts}_${rand}`;
}

function generateName(source, target) {
  const srcName = source.name || source.id || 'A';
  const tgtName = target.name || target.id || 'B';
  return `${srcName} → ${tgtName}`;
}

function determineStreamClass(source, target) {
  // Boundary detection: from blank canvas = external input, to blank = product/output
  if (!source.station_id && target.station_id) return 'EXTERNAL_INPUT';
  if (source.station_id && !target.station_id) return 'PRODUCT_OUTPUT';
  if (source.station_id && target.station_id) return 'INTERNAL_FLOW';
  return 'FREE';
}

function defaultComponents() {
  return {
    water: '', sucrose: '', invert: '', ash: '', ns1: '', ns2: '',
    crystals: '', caco3: '', cao: '', fiber: '',
    steamVapour: '', ethanolL: '', cola: '', co2: '', ammonia: ''
  };
}

// --- Endpoint Types -----------------------------------------------------

export function connectorEndpointIsPort(ep) {
  return !!ep && ep.type === 'port' && !!ep.station_id && !!ep.port_id;
}

export function connectorFullyAttached(c) {
  return connectorEndpointIsPort(c?.source) && connectorEndpointIsPort(c?.target);
}

export function portDefForEndpoint(ep, nodeDefs) {
  if (!connectorEndpointIsPort(ep)) return null;
  const n = stateLookup(nodeDefs, ep.station_id);
  if (!n) return null;
  const input = (n.inputs || []).find(p => p.id === ep.port_id);
  if (input) return { node: n, port: input, dir: 'in' };
  const output = (n.outputs || []).find(p => p.id === ep.port_id);
  if (output) return { node: n, port: output, dir: 'out' };
  return null;
}

export function connectorDirectionallyValid(c) {
  const src = portDefForEndpoint(c.source, nodeDefs);
  const tgt = portDefForEndpoint(c.target, nodeDefs);
  return src?.dir === 'out' && tgt?.dir === 'in';
}

export function stateLookup(nodeDefs, stationId) {
  if (!nodeDefs || !stationId) return null;
  // This requires the actual state to look up nodes by ID
  // Caller must pass state.nodes and use proper lookup
  return null; // placeholder
}

// --- Stream Role Determination ------------------------------------------
// The role of a connector is derived from its endpoint topology.

export function connectorRole(s) {
  if (!s || !connectorFullyAttached(s)) return 'UNCONNECTED';
  const src = portDefForEndpoint(s.source, nodeDefs);
  const tgt = portDefForEndpoint(s.target, nodeDefs);

  if (!src || !tgt) return 'UNCONNECTED';
  if (src.dir !== 'out' || tgt.dir !== 'in') return 'INVALID_TOPOLOGY';

  // Determine boundary type based on endpoints
  const srcType = sourceMediaType(s);
  const tgtType = targetMediaType(s);

  if (s.source.type === 'point' || s.source.type === 'undefined') {
    return 'EXTERNAL_INPUT';
  }
  if (s.target.type === 'point' || s.target.type === 'undefined') {
    return 'PRODUCT_OUTPUT';
  }
  return 'INTERNAL_FLOW';
}

function sourceMediaType(s) {
  const ep = s.source;
  if (ep.type === 'port') {
    const pd = portDefForEndpoint(ep, nodeDefs);
    if (pd && pd.port.accept === 'thermal') return 'thermal';
    if (pd && pd.port.accept === 'material') return 'material';
    if (pd && pd.port.accept === 'massecuite') return 'massecuite';
    return pd?.port?.category || 'material';
  }
  return 'unknown';
}

function targetMediaType(s) {
  const ep = s.target;
  if (ep.type === 'port') {
    const pd = portDefForEndpoint(ep, nodeDefs);
    if (pd && pd.port.accept === 'thermal') return 'thermal';
    if (pd && pd.port.accept === 'massecuite') return 'massecuite';
    return pd?.port?.category || 'material';
  }
  return 'unknown';
}

// --- Topology Validation ------------------------------------------------

export function connectorTopologyIssues(s) {
  const issues = [];

  // Check if fully attached
  if (!connectorFullyAttached(s)) {
    issues.push('Connector is not fully attached to two equipment ports.');
    return issues;
  }

  // Check directional validity
  if (!connectorDirectionallyValid(s)) {
    issues.push('Connector direction is invalid (must be output → input).');
  }

  // Check for same equipment
  if (s.source.station_id === s.target.station_id) {
    issues.push('Connector loops back to the same equipment.');
  }

  // Check for self-connection (same port)
  if (s.source.station_id === s.target.station_id &&
      s.source.port_id === s.target.port_id) {
    issues.push('Self-connection on the same port is not allowed.');
  }

  // Stream class specific issues
  if (connectorRole(s) === 'UNCONNECTED') {
    issues.push('Connector is unconnected.');
  }

  return issues;
}

// --- Connector Solver Status --------------------------------------------

export function connectorSolverActive(s) {
  return s && s.solver?.solveStatus === 'SOLVED';
}

export function connectorHasPreparedMedium(s) {
  return !!(s && s.mediumType && s.properties?.flow);
}

export function connectorEndpointAllowedDirections(c, which) {
  if (which !== 'source' && which !== 'target') return [];
  const ep = c[which];
  if (!connectorEndpointIsPort(ep)) {
    return ['left', 'right', 'top', 'bottom']; // Any direction for floating endpoint
  }
  if (ep.type === 'port') {
    const n = state.nodes.find(n => n.id === ep.station_id);
    if (!n) return [];
    const def = nodeDefs[n.type];
    const inputs = def?.inputs || [];
    const outputs = def?.outputs || [];
    const port = (inputs || []).find(p => p.id === ep.port_id) ||
                 (outputs || []).find(p => p.id === ep.port_id);
    if (port) return [port.side];
  }
  return [];
}

export function connectorOtherEndpoint(c, which) {
  return which === 'source' ? c.target : c.source;
}

export function connectorHasNeutralEndpoints(c) {
  // Neutral = both endpoints are floating (not attached to equipment)
  return (!connectorEndpointIsPort(c.source) || c.source.type === 'point') &&
         (!connectorEndpointIsPort(c.target) || c.target.type === 'point');
}

// --- Medium-Specific Flow Checkers --------------------------------------

export function connectorFeedsPanHeatingPort(s) {
  if (!s) return false;
  // Check if this stream feeds a pan's steam input
  const target = s.target;
  if (target?.type !== 'port') return false;
  const n = state.nodes.find(n => n.id === target.station_id);
  if (!n || n.type !== 'pan') return false;
  const port = (nodeDefs.pan?.inputs || []).find(p => p.id === target.port_id);
  return port && port.accept === 'thermal';
}

export function connectorFeedsPanProcessPort(s) {
  if (!s) return false;
  const target = s.target;
  if (target?.type !== 'port') return false;
  const n = state.nodes.find(n => n.id === target.station_id);
  if (!n || n.type !== 'pan') return false;
  const port = (nodeDefs.pan?.inputs || []).find(p => p.id === target.port_id);
  return port && port.accept === 'material';
}

export function connectorFeedsCrystallizerProcessPort(s) {
  if (!s) return false;
  const target = s.target;
  if (target?.type !== 'port') return false;
  const n = state.nodes.find(n => n.id === target.station_id);
  if (!n || n.type !== 'crystallizer') return false;
  return true; // All crystallizer inputs are material
}

export function connectorFeedsCentrifugalWashPort(s) {
  if (!s) return false;
  const target = s.target;
  if (target?.type !== 'port') return false;
  const n = state.nodes.find(n => n.id === target.station_id);
  if (!n || (n.type !== 'centrifugal2' && n.type !== 'centrifugal3')) return false;
  const port = (nodeDefs[n.type]?.inputs || []).find(p => p.id === target.port_id);
  return port && port.accept === 'any'; // Wash input
}

export function connectorFeedsCentrifugalMassecuitePort(s) {
  if (!s) return false;
  const target = s.target;
  if (target?.type !== 'port') return false;
  const n = state.nodes.find(n => n.id === target.station_id);
  if (!n || (n.type !== 'centrifugal2' && n.type !== 'centrifugal3')) return false;
  const port = (nodeDefs[n.type]?.inputs || []).find(p => p.id === target.port_id);
  return port && port.accept === 'massecuite';
}

// --- Connected Streams Lookup -------------------------------------------

export function connectedStreamsForPort(nodeId, portId, dir, state) {
  if (!state.connectors) return [];
  return state.connectors.filter(c => {
    const ep = dir === 'in' ? c.target : c.source;
    return ep?.type === 'port' && ep.station_id === nodeId && ep.port_id === portId;
  });
}

// --- Port Occupancy Check -----------------------------------------------

export function portOccupiedByOtherConnector(c, node, port, dir, state) {
  if (!state.connectors) return null;
  const other = state.connectors.find(conn => {
    if (conn.id === c.id) return false; // Same connector
    const ep = dir === 'in' ? conn.target : conn.source;
    return ep?.type === 'port' && ep.station_id === node.id && ep.port_id === port.id;
  });
  return other || null;
}

// --- Helper: Get Port Rejection Message -------------------------------

export function portRejectionMessage(c, which, reason) {
  return `Cannot connect: ${reason}`;
}

// --- Stream Summary Helpers ---------------------------------------------

export function streamHasSteamVapour(s) {
  const c = s.components || {};
  return (c.steamVapour || c.steamVapour || c.ethanolG || c.co2 || c.ammonia) > 0;
}

export function streamQuantityEditable(s) {
  return s && s.properties && ['MATERIAL_MASS', 'VOLUME', 'MATERIAL_MOL'].includes(s.quantityMode);
}