/**
 * solver/topology.js — Process Topology Solver & Validation.
 *
 * Engages with the Sugar Engineering solver to validate topology, calculate
 * required-flow/pressure paths, and prepare the engineering model for solving.
 * Pure functions on plain objects, no DOM dependencies.
 */

/**
 * Run the Phase 2–3 topology solver.
 * Input: diagram state, node definitions, equipment model
 * Output: solved state with status and results
 */
export async function runPhase23Solver(state, nodeDefs, equipmentModel) {
  const issues = collectSolverDiagnostics(state, nodeDefs, equipmentModel);
  const result = { ok: false, issues, message: '' };

  // Quick preliminary validation
  if (!state || !Array.isArray(state.nodes) || !Array.isArray(state.connectors)) {
    result.message = 'Invalid state format';
    return result;
  }

  // 1. Validate connectivity
  const connectivityIssues = validateConnectivity(state.connectors);
  if (connectivityIssues.length) {
    result.issues.push(...connectivityIssues);
  }

  // 2. Identify boundary streams
  const streams = state.connectors.map(connector => connectorToStream(connector, state.nodes));
  const boundaryStreams = streams.filter(s => ['EXTERNAL_INPUT', 'PRODUCT_OUTPUT'].includes(s?.role));

  // 3. Create engineering model (topology + parameters)
  const engineeringModel = {
    nodes: state.nodes.map(n => ({
      id: n.id,
      type: n.type,
      stationNumber: n.stationNumber,
      equipmentTag: n.equipmentTag,
      label: n.label,
      params: n.params || {},
      ports: nodeDefs[n.type]?.inputs || [],
      solveStatus: n.solveStatus || 'UNSOLVED'
    })),
    streams: streams.map(s => ({
      id: s.id,
      source: s.source,
      target: s.target,
      role: s.role || streamBoundaryType(s),
      streamClass: s.streamClass,
      mediumType: s.mediumType,
      properties: s.properties,
      components: s.components,
      solveStatus: s.solveStatus || 'UNSOLVED'
    })),
    requiredPaths: [],
    pressurePaths: []
  };

  // 4. Run station solvers in dependency order
  const solved = await solveStations(engineeringModel, equipmentModel);

  // 5. Collect solver diagnostics
  const diagnostics = await collectSolverDiagnostics(state, nodeDefs, equipmentModel);

  // 6. Build final result
  result.ok = solved.ok;
  result.partial = solved.partial;
  result.message = solved.message || (result.ok ? 'Network solved successfully' : 'Solver produced issues');

  // Merge diagnostics
  if (diagnostics.length) {
    result.issues.push(...diagnostics);
  }

  // Update stream statuses
  for (let i = 0; i < state.connectors.length; i++) {
    const s = streams[i];
    const connector = state.connectors[i];
    if (s?.solveStatus) connector.solveStatus = s.solveStatus;
    if (s?.solverMessage) connector.solverMessage = s.solverMessage;
  }

  return result;
}

/**
 * Validate connector connectivity and topology rules.
 */
export function validateConnectivity(connectors) {
  const issues = [];
  for (let i = 0; i < connectors.length; i++) {
    const c = connectors[i];
    const { source, target } = c;

    // Check attachment
    if (!source || !target) {
      issues.push(`Connector ${c.id}: missing source or target`);
      continue;
    }

    // Check endpoint directionality (simple)
    if (source.port_id && !target.port_id) {
      issues.push(`Connector ${c.id}: source is a port but target is not`);
    }

    // Validate stream class if explicitly set
    if (c.streamClass && c.streamClass !== 'material' && c.streamClass !== 'thermal' && c.streamClass !== 'condensate' && c.streamClass !== 'water') {
      issues.push(`Connector ${c.id}: invalid streamClass "${c.streamClass}"`);
    }

    // Ensure no self-connection
    if (source.station_id && target.station_id && source.station_id === target.station_id) {
      issues.push(`Connector ${c.id}: loops back to same equipment`);
    }
  }
  return issues;
}

/**
 * Convert a connector to engineering stream object for the solver.
 */
export function connectorToStream(connector, nodes) {
  const sourceNode = nodes?.find(n => n.id === connector.fromNodeId);
  const targetNode = nodes?.find(n => n.id === connector.toNodeId);

  return {
    id: connector.id,
    name: connector.name || connector.id,
    source: connector.source || {},
    target: connector.target || {},
    role: connectorRole(connector),
    streamClass: connector.streamClass || 'material',
    mediumType: connector.mediumType || 'Syrup',
    properties: connector.properties || {},
    components: connector.components || {},
    solveStatus: connector.solveStatus || 'UNSOLVED',
    solverMessage: connector.solverMessage || ''
  };
}

/**
 * Determine connector role from its endpoint topology.
 */
export function connectorRole(connector) {
  if (!connector) return 'UNKNOWN';

  const src = connector.source || {};
  const tgt = connector.target || {};

  // Determine boundary type based on endpoints
  const hasSrcPort = src.type === 'port' && src.station_id && src.port_id;
  const hasTgtPort = tgt.type === 'port' && tgt.station_id && tgt.port_id;

  if (!hasSrcPort && !hasTgtPort) return 'FREE';
  if (!hasSrcPort && hasTgtPort) return 'EXTERNAL_INPUT';
  if (hasSrcPort && !hasTgtPort) return 'PRODUCT_OUTPUT';
  return 'INTERNAL_FLOW';
}

/**
 * Determine stream boundary type for the solver.
 */
export function streamBoundaryType(stream) {
  if (!stream) return 'UNKNOWN';
  const src = stream.source || {};
  const tgt = stream.target || {};

  if (!src.equipmentId && tgt.equipmentId) return 'EXTERNAL_INPUT';
  if (src.equipmentId && !tgt.equipmentId) return 'PRODUCT_OUTPUT';
  if (src.equipmentId && tgt.equipmentId) return 'INTERNAL_FLOW';
  return 'FREE';
}

/**
 * Collect comprehensive solver diagnostics and issues.
 */
export async function collectSolverDiagnostics(state, nodeDefs, equipmentModel) {
  const issues = [];
  const streams = state.connectors.map(c => connectorToStream(c, state.nodes));

  // Validate all connectors
  for (const c of state.connectors) {
    const connIssues = connectorTopologyIssues(c);
    if (connIssues.length) issues.push(...connIssues.map(msg => ({ stream: c.id, message: msg })));
  }

  // Validate stream completeness
  for (const s of streams) {
    if (!s) continue;
    const bt = streamBoundaryType(s);
    if (bt === 'FREE') {
      issues.push({ stream: s.id, message: 'Stream is unconnected at both ends' });
    }

    // Check mass balance: sum of components percentages
    const componentSum = Object.values(s.components || {}).reduce((a, v) => a + (parseFloat(v) || 0), 0);
    if (componentSum > 100.1) issues.push({ stream: s.id, message: `Component sum ${componentSum.toFixed(2)}% exceeds 100%` });

    // Check temperature/pressure units consistency
    if ((s.properties?.temperature || '') && (s.properties?.pressureAbs || '')) {
      const T = parseFloat(s.properties.temperature);
      const P = parseFloat(s.properties.pressureAbs);
      if (Number.isFinite(T) && Number.isFinite(P)) {
        const tsat = satTempCFromKPa(P);
        if (tsat && Math.abs(T - tsat) > 5) issues.push({ stream: s.id, message: `Temperature ${T}°C differs from saturation at ${P} kPa (~${tsat.toFixed(1)}°C)` });
      }
    }
  }

  return issues;
}

/**
 * Execute station solvers in the correct dependency order.
 */
async function solveStations(engineeringModel, equipmentModel) {
  const result = { ok: true, partial: false, message: '', solved: [] };

  // Sort stations by topological order (simple breadth-first)
  const stations = engineeringModel.nodes.filter(n => equipmentModel.isStation(n.type));
  const boundary = engineeringModel.nodes.filter(n => equipmentModel.isBoundaryNode(n.type));

  // Solve boundary nodes first (external flows)
  for (const n of boundary) {
    const solved = await solveStation(equipmentModel, n);
    if (solved.ok) result.solved.push(n.id);
    else result.partial = true;
  }

  // Solve connected process equipment in dependency order
  for (const n of stations) {
    const deps = findDependencies(engineeringModel, n.id);
    const unsolved = deps.filter(id => !result.solved.includes(id));
    if (unsolved.length === 0 || deps.every(id => result.solved.includes(id))) {
      const solved = await solveStation(equipmentModel, n);
      if (solved.ok) result.solved.push(n.id);
      else result.partial = true;
    } else {
      result.partial = true;
    }
  }

  result.message = result.partial ? 'Solver completed with warnings' : 'All stations solved successfully';
  return result;
}

/**
 * Solve a single station using the equipment model.
 */
async function solveStation(equipmentModel, node) {
  try {
    if (equipmentModel.isBoundaryNode(node.type)) {
      return { ok: true, status: 'BOUNDARY', solved: node.id };
    }
    if (!equipmentModel.hasStationSolver(node.type)) {
      return { ok: false, status: 'UNSOLVED', solved: node.id, message: 'No station solver for this equipment type' };
    }
    // Delegate to actual station solver (pan, crystallizer, etc.)
    const solver = equipmentModel.getStationSolver(node.type);
    const solved = await solver(node, equipmentModel);
    return { ok: solved.ok, status: solved.status || 'SOLVED', solved: node.id };
  } catch (e) {
    return { ok: false, status: 'ERROR', solved: node.id, message: e.message };
  }
}

/**
 * Find all dependent stations (inputs) for a given station.
 */
function findDependencies(engineeringModel, stationId) {
  const streams = engineeringModel.streams || [];
  const dependents = [];

  for (const s of streams) {
    const src = s.source?.equipmentId;
    const tgt = s.target?.equipmentId;
    if (tgt === stationId) dependents.push(src);
  }

  return [...new Set(dependents)].filter(id => id);
}

// --- Station Solver Registry ---------------------------------------------

const stationSolvers = new Map();

export function registerStationSolver(type, solver) {
  stationSolvers.set(type, solver);
}

export function getStationSolver(type) {
  return stationSolvers.get(type);
}

export function isBoundaryNode(type) {
  const boundaryTypes = ['source', 'sink', 'seed', 'wash', 'clearjuice', 'hotwater'];
  return boundaryTypes.includes(type);
}

export function hasStationSolver(type) {
  return stationSolvers.has(type);
}

export function isStation(type) {
  return !isBoundaryNode(type) && hasStationSolver(type);
}

// Export everything
export { runPhase23Solver, validateConnectivity, collectSolverDiagnostics, connectorToStream,
  connectorRole, streamBoundaryType, registerStationSolver, getStationSolver,
  isBoundaryNode, hasStationSolver, isStation };