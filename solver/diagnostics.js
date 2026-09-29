/**
 * solver/diagnostics.js — Solver diagnostics and issue reporting.
 *
 * Generates structured diagnostic reports from the engineering model.
 * Pure functions on plain objects. No DOM dependencies.
 */

export function collectSolverDiagnostics(state, nodeDefs) {
  const issues = [];

  // --- Node diagnostics ---
  for (let i = 0; i < state.nodes.length; i++) {
    const n = state.nodes[i];
    const def = nodeDefs[n.type];
    if (!def) {
      issues.push({ station: n.id, type: 'UNKNOWN_EQUIPMENT', message: `Unknown equipment type: ${n.type}` });
      continue;
    }

    // Check missing parameters
    const defaults = def.defaults || {};
    const params = n.params || {};
    for (const [key, val] of Object.entries(defaults)) {
      if (params[key] === undefined || params[key] === '') {
        issues.push({ station: n.id, type: 'MISSING_PARAMETER', parameter: key, message: `Missing parameter: ${key}` });
      }
    }

    // Check equipment-specific validation
    const eqIssues = validateEquipmentSpecifics(n, def);
    issues.push(...eqIssues.map(m => ({ station: n.id, type: 'EQUIPMENT_VALIDATION', message: m })));
  }

  // --- Connector diagnostics ---
  for (let i = 0; i < state.connectors.length; i++) {
    const c = state.connectors[i];
    const role = connectorRole(c);

    if (role === 'UNCONNECTED') {
      issues.push({ stream: c.id, type: 'UNCONNECTED', message: 'Connector is unconnected' });
    } else if (role === 'INVALID_TOPOLOGY') {
      issues.push({ stream: c.id, type: 'INVALID_TOPOLOGY', message: 'Invalid topology (not output → input)' });
    }

    // Check for missing stream properties on connected streams
    if (c.properties && Object.keys(c.properties).length === 0) {
      issues.push({ stream: c.id, type: 'EMPTY_PROPERTIES', message: 'Stream has no properties specified' });
    }
  }

  // --- Flow consistency ---
  const flowIssues = validateFlowConsistency(state);
  issues.push(...flowIssues);

  return issues;
}

function validateEquipmentSpecifics(node, def) {
  const issues = [];
  const params = node.params || {};

  switch (node.type) {
    case 'pan':
      // BPE convergence check
      if (!params.bpeMethod) issues.push('Pan: BPE method not specified');
      if (!Number.isFinite(parseFloat(params.pressureMode === 'VAPOUR_PRESSURE' ? params.panVapourPressure : params.massecuiteTemperature))) {
        issues.push('Pan: saturation temperature or pressure not specified');
      }
      break;

    case 'crystallizer':
      if (!Number.isFinite(parseFloat(params.outputTemperature))) {
        issues.push('Crystallizer: output temperature not specified');
      }
      if (!Number.isFinite(parseFloat(params.targetSupersaturation))) {
        issues.push('Crystallizer: target supersaturation not specified');
      }
      break;

    case 'centrifugal2':
    case 'centrifugal3':
      if (!params.mode) issues.push(`${node.type}: machine type not specified`);
      break;

    case 'evaporator':
      if (!Number.isFinite(parseFloat(params.heatTransferCoefficient))) {
        issues.push('Evaporator: heat transfer coefficient not specified');
      }
      break;

    case 'heater':
      if (!params.controlMode) issues.push('Heater: control mode not specified');
      if (!Number.isFinite(parseFloat(params.targetTemp))) issues.push('Heater: target temperature not specified');
      break;

    case 'injectionHeater':
      if (!Number.isFinite(parseFloat(params.temperatureOut))) {
        issues.push('Injection heater: outlet temperature not specified');
      }
      break;

    case 'flashTank':
      if (!Number.isFinite(parseFloat(params.flashPressure))) {
        issues.push('Flash tank: flash pressure not specified');
      }
      break;

    case 'melter':
      if (!Number.isFinite(parseFloat(params.targetBrix))) {
        issues.push('Melter: target brix not specified');
      }
      break;

    case 'separatorFilter':
      if (!params.presetProfile) issues.push('Separator/filter: preset profile not specified');
      break;
  }

  return issues;
}

export function connectorRole(c) {
  if (!c) return 'UNKNOWN';
  const src = c.source || {};
  const tgt = c.target || {};
  const hasSrcPort = src.type === 'port' && src.station_id && src.port_id;
  const hasTgtPort = tgt.type === 'port' && tgt.station_id && tgt.port_id;
  if (!hasSrcPort && !hasTgtPort) return 'UNCONNECTED';
  if (hasSrcPort && !hasTgtPort) return 'INVALID_TOPOLOGY';
  return 'VALID';
}

export function validateFlowConsistency(state) {
  const issues = [];

  // Check for multiple streams between same equipment pair
  const pairs = {};
  for (const c of state.connectors) {
    const src = c.fromNodeId || c.source?.station_id;
    const tgt = c.toNodeId || c.target?.station_id;
    if (!src || !tgt) continue;
    const key = `${src}→${tgt}`;
    if (!pairs[key]) pairs[key] = [];
    pairs[key].push(c.id);
  }

  for (const [key, ids] of Object.entries(pairs)) {
    if (ids.length > 1) {
      issues.push({ streams: ids, type: 'MULTIPLE_STREAMS', message: `Multiple streams between ${key}: ${ids.join(', ')}` });
    }
  }

  return issues;
}

export function solverIssueSummary(issues) {
  const byType = {};
  for (const issue of issues) {
    const type = issue.type || 'UNKNOWN';
    byType[type] = (byType[type] || 0) + 1;
  }

  const counts = { total: issues.length, byType, critical: 0, warnings: 0 };
  for (const issue of issues) {
    if (issue.type === 'ERROR' || issue.type === 'MISSING_PARAMETER') counts.critical++;
    else if (issue.type === 'WARN' || issue.type === 'EMPTY_PROPERTIES') counts.warnings++;
  }

  return counts;
}