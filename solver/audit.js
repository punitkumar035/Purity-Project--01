/**
 * solver/audit.js — Solver audit and engineering report generation.
 *
 * Generates comprehensive audit reports from the engineering model.
 * Pure functions on plain objects. No DOM dependencies.
 */

export function renderSolverAudit(state, nodeDefs, diagnostics, streamStates) {
  if (!state || !state.nodes || !state.connectors) {
    return {
      ok: false,
      message: 'Invalid state for audit',
      steps: [],
      requiredPaths: [],
      pressurePaths: [],
      streamRows: [],
      nodeRows: []
    };
  }

  // Build audit steps from solver execution order
  const steps = buildAuditSteps(state, diagnostics);

  // Required-flow paths
  const requiredPaths = buildRequiredPaths(state.connectors);

  // Pressure-feedback paths
  const pressurePaths = buildPressurePaths(state.connectors);

  // Stream status rows
  const streamRows = state.connectors.map((s, i) => ({
    id: s.id || s.name || `Stream ${i}`,
    role: connectorRole(s),
    quantityMode: s.quantityMode || 'MATERIAL_MASS',
    pressureMode: s.pressureMode || 'ABSOLUTE',
    solveStatus: s.solveStatus || 'UNSOLVED',
    solverMessage: s.solverMessage || ''
  }));

  // Node status rows
  const nodeRows = state.nodes.map(n => ({
    id: n.id,
    equipmentTag: n.equipmentTag || '—',
    label: n.label || n.type || '—',
    type: n.type,
    solveStatus: n.solveStatus || 'UNSOLVED',
    solverMessage: n.solverMessage || ''
  }));

  return {
    ok: true,
    steps,
    requiredPaths,
    pressurePaths,
    streamRows,
    nodeRows,
    message: `Audit complete: ${steps.length} steps, ${streamRows.length} streams, ${nodeRows.length} stations`
  };
}

function buildAuditSteps(state, diagnostics) {
  const steps = [];

  // 1. Topology validation step
  const topologyIssues = diagnostics.filter(d => d.type === 'TOPOLOGY_VALIDATION');
  steps.push({
    name: 'Topology Validation',
    detail: `Checked ${state.connectors.length} streams, found ${topologyIssues.length} issues`,
    state: topologyIssues.length > 0 ? 'WARN' : 'PASS'
  });

  // 2. Required-flow path step
  const requiredStreams = state.connectors.filter(c => isRequiredFlow(c));
  steps.push({
    name: 'Required-Flow Paths',
    detail: `Identified ${requiredStreams.length} required-flow streams`,
    state: requiredStreams.length > 0 ? 'PASS' : 'WARN'
  });

  // 3. Pressure-feedback path step
  const pressureStreams = state.connectors.filter(c => isPressureFeedback(c));
  steps.push({
    name: 'Pressure-Feedback Paths',
    detail: `Identified ${pressureStreams.length} pressure-feedback streams`,
    state: pressureStreams.length > 0 ? 'PASS' : 'WARN'
  });

  // 4. Solver execution steps (per equipment type)
  const byType = {};
  for (const n of state.nodes) {
    if (!byType[n.type]) byType[n.type] = [];
    byType[n.type].push(n);
  }

  for (const [type, nodes] of Object.entries(byType)) {
    const typeName = nodeDefs?.[type]?.title || type;
    const solved = nodes.filter(n => n.solveStatus === 'SOLVED').length;
    steps.push({
      name: `${typeName} Solver`,
      detail: `Solved ${solved} of ${nodes.length} ${typeName} stations`,
      state: solved === nodes.length ? 'PASS' : solved > 0 ? 'PARTIAL' : 'WAIT'
    });
  }

  return steps;
}

function isRequiredFlow(stream) {
  // Required flow streams are external inputs that feed process equipment
  const role = connectorRole(stream);
  return role === 'EXTERNAL_INPUT';
}

function isPressureFeedback(stream) {
  // Pressure feedback streams are those that provide upstream pressure info
  // e.g., pan vapour pressure affecting upstream evaporator
  return stream.properties?.pressureFeedback === true ||
         (stream.source && stream.source.type === 'port');
}

function buildRequiredPaths(connectors) {
  const paths = [];
  for (const c of connectors) {
    const role = connectorRole(c);
    if (role === 'EXTERNAL_INPUT' || role === 'INTERNAL_FLOW') {
      const status = c.solveStatus || 'UNSOLVED';
      const pathLabels = getPathLabels(c);
      paths.push({
        stream: c.id,
        status,
        path: pathLabels,
        message: c.solverMessage || ''
      });
    }
  }
  return paths;
}

function buildPressurePaths(connectors) {
  const paths = [];
  for (const c of connectors) {
    if (isPressureFeedback(c)) {
      const status = c.solveStatus || 'UNSOLVED';
      paths.push({
        stream: c.id,
        status,
        path: [],
        message: c.solverMessage || ''
      });
    }
  }
  return paths;
}

function getPathLabels(connector) {
  const labels = [];
  const src = connector.source;
  const tgt = connector.target;
  if (src?.station_id) labels.push(src.station_id);
  if (tgt?.station_id) labels.push(tgt.station_id);
  return labels;
}

function connectorRole(c) {
  if (!c) return 'UNKNOWN';
  const src = c.source || {};
  const tgt = c.target || {};
  const hasSrcPort = src.type === 'port' && src.station_id && src.port_id;
  const hasTgtPort = tgt.type === 'port' && tgt.station_id && tgt.port_id;
  if (!hasSrcPort && !hasTgtPort) return 'UNCONNECTED';
  if (hasSrcPort && !hasTgtPort) return 'INVALID_TOPOLOGY';
  return 'INTERNAL_FLOW';
}

// --- Equipment Audit ----------------------------------------------------

export function auditEquipmentNodes(state, nodeDefs) {
  const results = [];

  for (const n of state.nodes) {
    const def = nodeDefs[n.type];
    const entry = {
      id: n.id,
      tag: n.equipmentTag || '—',
      type: n.type,
      label: n.label || '—',
      stationNumber: n.stationNumber || '—',
      solveStatus: n.solveStatus || 'UNSOLVED',
      issues: []
    };

    // Check missing parameters
    if (def?.defaults) {
      for (const [key, val] of Object.entries(def.defaults)) {
        if ((n.params?.[key] ?? '') === '' && n.params?.[key] !== 0) {
          entry.issues.push(`Missing parameter: ${key}`);
        }
      }
    }

    results.push(entry);
  }

  return results;
}

// --- Stream Audit ------------------------------------------------------

export function auditStreams(state) {
  const results = [];

  for (const c of state.connectors) {
    const entry = {
      id: c.id,
      name: c.name || '—',
      role: connectorRole(c),
      mediumType: c.mediumType || 'Syrup',
      quantityMode: c.quantityMode || 'MATERIAL_MASS',
      pressureMode: c.pressureMode || 'ABSOLUTE',
      solveStatus: c.solveStatus || 'UNSOLVED',
      solverMessage: c.solverMessage || '',
      issues: []
    };

    // Check topology issues
    const topoIssues = connectorTopologyIssues(c);
    entry.issues.push(...topoIssues);

    results.push(entry);
  }

  return results;
}

// --- Mass Balance ------------------------------------------------------

export function computeMassBalance(state) {
  const balances = {
    inputs: [],
    outputs: [],
    internal: [],
    netBalance: { flow: 0, solids: 0 }
  };

  for (const c of state.connectors) {
    const role = connectorRole(c);
    const flow = parseFloat(c.properties?.flow) || 0;
    const ds = parseFloat(c.components?.sucrose || 0) / 100;

    const streamData = {
      id: c.id,
      name: c.name,
      flow,
      solids: flow * ds,
      mediumType: c.mediumType
    };

    if (role === 'EXTERNAL_INPUT') balances.inputs.push(streamData);
    else if (role === 'PRODUCT_OUTPUT') balances.outputs.push(streamData);
    else balances.internal.push(streamData);

    balances.netBalance.flow += flow;
    balances.netBalance.solids += flow * ds;
  }

  return balances;
}

// --- Export helpers ---------------------------------------------------

export function auditToJSON(audit) {
  return JSON.stringify(audit, null, 2);
}

export function auditToCSV(audit) {
  if (!audit.streamRows) return '';
  const rows = audit.streamRows.map(r =>
    `${r.id},${r.role},${r.quantityMode},${r.pressureMode},${r.solveStatus},${r.solverMessage}`
  );
  return 'ID,Role,Quantity,Pressure,Status,Message\n' + rows.join('\n');
}