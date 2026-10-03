/**
 * solver/validation.js — Engineering Validation & Diagnostics.
 *
 * Run validation checks on the engineering model and produce structured
 * diagnostic reports for the UI to display.
 * Pure functions on plain objects. No DOM dependencies.
 */

// --- Validation Results --------------------------------------------------

export function validationResult(type, status, message, details = null) {
  return {
    type,
    status, // 'OK', 'WARN', 'ERROR', 'UNSOLVED', 'READY'
    message,
    details,
    timestamp: Date.now()
  };
}

export function validationSummary(results) {
  const byStatus = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return {
    total: results.length,
    ok: byStatus.OK || 0,
    warn: byStatus.WARN || 0,
    error: byStatus.ERROR || 0,
    unsolved: byStatus.UNSOLVED || 0,
    ready: byStatus.READY || 0,
    healthy: !byStatus.ERROR && !byStatus.UNSOLVED,
    message: generateValidationMessage(byStatus)
  };
}

function generateValidationMessage(byStatus) {
  if (byStatus.ERROR) return 'Engineering model contains errors that must be fixed.';
  if (byStatus.UNSOLVED) return 'Model is partially solved; some stations require attention.';
  if (byStatus.WARN) return 'Model solved with warnings.';
  if (byStatus.READY) return 'All equipment is ready for solving.';
  if (byStatus.OK) return 'All stations solved successfully.';
  return 'No model data.';
}

// --- Stream Validation ---------------------------------------------------

export function validateStream(stream, streamIndex) {
  const results = [];

  // Boundary validation
  const bt = streamBoundaryType(stream);
  results.push(validationResult('stream-boundary', bt === 'FREE' ? 'ERROR' : 'OK',
    bt === 'FREE' ? 'Stream is free (unconnected)' :
    bt === 'EXTERNAL_INPUT' ? 'External input stream' :
    bt === 'PRODUCT_OUTPUT' ? 'Product/output stream' :
    bt === 'INTERNAL_FLOW' ? 'Internal process stream' : 'Unknown boundary', {
      boundary: bt,
      source: stream.source,
      target: stream.target
    }));

  // Component ledger validation
  const compSum = Object.values(stream.components || {}).reduce((a, v) => a + (parseFloat(v) || 0), 0);
  const compStatus = compSum > 100.1 ? 'ERROR' : compSum < 99.9 ? 'WARN' : 'OK';
  results.push(validationResult('stream-components', compStatus,
    compSum > 100.1 ? `Component sum ${compSum.toFixed(2)}% exceeds 100%` :
    compSum < 99.9 ? `Component sum ${compSum.toFixed(2)}% below 100%` :
    `Component ledger valid (${compSum.toFixed(2)}%)`, {
      componentSum: compSum,
      count: Object.keys(stream.components || {}).length
    }));

  // Mass balance validation
  const totalFlow = parseFloat(stream?.properties?.flow);
  if (Number.isFinite(totalFlow) && totalFlow < 0) {
    results.push(validationResult('stream-flow', 'ERROR', 'Flow must be non-negative', {
      flow: totalFlow
    }));
  }

  // Temperature/Pressure consistency
  const T = parseFloat(stream?.properties?.temperature);
  const P = parseFloat(stream?.properties?.pressureAbs);
  if (Number.isFinite(T) && Number.isFinite(P)) {
    const Tsat = satTempCFromKPa(P);
    const diff = Math.abs(T - Tsat);
    if (diff > 50) {
      results.push(validationResult('stream-conditions', 'WARN',
        `Temperature ${T}°C differs significantly from saturation at ${P} kPa (~${Tsat.toFixed(1)}°C)`, {
          temperature: T,
          pressure: P,
          saturationTemp: Tsat,
          difference: diff
        }));
    }
  }

  return results;
}

// --- Equipment Validation -----------------------------------------------

export function validateEquipment(equipment, index) {
  const results = [];

  // Station identity validation
  if (!equipment.id) {
    results.push(validationResult('equipment-identity', 'ERROR', 'Equipment missing ID'));
  }

  if (!equipment.type) {
    results.push(validationResult('equipment-type', 'ERROR', 'Equipment type not specified'));
  } else if (!equipment.type) {
    results.push(validationResult('equipment-type', 'ERROR', `Unknown equipment type: ${equipment.type}`));
  }

  // Station number validation
  if (!equipment.stationNumber) {
    results.push(validationResult('equipment-station', 'WARN', 'No station number assigned'));
  } else if (equipment.stationNumber < 1 || equipment.stationNumber > 9999) {
    results.push(validationResult('equipment-station', 'ERROR', `Invalid station number: ${equipment.stationNumber}`));
  }

  // Equipment tag validation
  if (!equipment.equipmentTag) {
    results.push(validationResult('equipment-tag', 'WARN', 'No equipment tag assigned'));
  } else if (equipment.equipmentTag.length > 20) {
    results.push(validationResult('equipment-tag', 'WARN', 'Equipment tag is unusually long'));
  }

  // Process parameters validation (type-specific)
  const paramResults = validateEquipmentParameters(equipment);
  results.push(...paramResults);

  return results;
}

function validateEquipmentParameters(eq) {
  const type = eq.type;
  const params = eq.params || {};
  const results = [];

  switch (type) {
    case 'pan':
      validatePanParameters(params, results);
      break;
    case 'crystallizer':
      validateCrystallizerParameters(params, results);
      break;
    case 'centrifugal2':
    case 'centrifugal3':
      validateCentrifugalParameters(params, results);
      break;
    case 'evaporator':
      validateEvaporatorParameters(params, results);
      break;
    case 'heater':
    case 'melter':
      validateHeatExchangerParameters(params, results);
      break;
    case 'injectionHeater':
      validateInjectionHeaterParameters(params, results);
      break;
    case 'flashTank':
      validateFlashTankParameters(params, results);
      break;
    default:
      // Generic validation
      if (params.flow && params.flow < 0) {
        results.push(validationResult('equipment-params-flow', 'ERROR', 'Negative flow specified', { flow: params.flow }));
      }
  }

  return results;
}

function validatePanParameters(params, results) {
  const mode = params.operationMode || '';
  if (!mode) {
    results.push(validationResult('pan-operation-mode', 'WARN', 'Operation mode not specified'));
  }

  const ds = params.targetMassecuiteDS || params.solidsControl || '';
  if (!ds && ds !== '0' && ds !== '0.0') {
    results.push(validationResult('pan-massecuite', 'WARN', 'Target massecuite DS not specified'));
  } else if (ds && (parseFloat(ds) < 0 || parseFloat(ds) > 1)) {
    results.push(validationResult('pan-massecuite', 'ERROR', `Target massecuite DS out of range: ${ds}`));
  }

  // BPE validation
  const bpeMethod = params.bpeMethod || 'BPE_SASKA_ASI_2002_EQ8';
  if (!['BPE_SASKA_ASI_2002_EQ8', 'BUBNIK_KADLEC_1995_TECHNICAL', 'USER_INPUT'].includes(bpeMethod)) {
    results.push(validationResult('pan-bpe', 'ERROR', `Unsupported BPE method: ${bpeMethod}`));
  }
}

function validateCrystallizerParameters(params, results) {
  const ss = params.targetSupersaturation || '';
  if (ss && (parseFloat(ss) < 0 || parseFloat(ss) > 10)) {
    results.push(validationResult('crystallizer-ss', 'WARN', `Supersaturation ${ss} appears unusually high`));
  }
}

function validateCentrifugalParameters(params, results) {
  const mode = params.mode || 'Helpbook evaluation';
  if (mode === 'Helpbook evaluation') {
    results.push(validationResult('centrifugal-mode', 'WARN', 'Using helpbook evaluation; consider specifying actual operating parameters'));
  }
}

function validateEvaporatorParameters(params, results) {
  const p = params || {};
  const mode = String(p.mode || 'PRESSURE').toUpperCase();
  if (!['HTC', 'PRESSURE', 'FEEDBACK', 'FLOW_TEMP'].includes(mode)) {
    results.push(validationResult('evaporator-mode', 'ERROR', 'Evaporator performance mode must be HTC, PRESSURE, FEEDBACK or FLOW_TEMP (exactly one).'));
    return;
  }
  const effectNo = parseInt(p.effectNo, 10);
  if (!Number.isInteger(effectNo) || effectNo < 1) {
    results.push(validationResult('evaporator-effect', 'ERROR', 'Evaporator Effect Number must be an integer >= 1.'));
  }
  if (mode === 'HTC') {
    if (!(parseFloat(p.htc_W_m2K) > 0)) {
      results.push(validationResult('evaporator-htc', 'ERROR', 'HTC mode requires Heat Transfer Coefficient U > 0 (V-04).'));
    }
    if (!(parseFloat(p.heatingSurface_m2) > 0)) {
      results.push(validationResult('evaporator-area', 'ERROR', 'HTC mode requires Heating Surface A > 0 (V-04).'));
    }
  }
  if (mode === 'PRESSURE') {
    const vp = p.vaporPressure || {};
    const rawP = (vp && typeof vp === 'object') ? vp.value : vp;
    const hasP = Number.isFinite(parseFloat(rawP)) && parseFloat(rawP) > 0;
    const hasT = Number.isFinite(parseFloat(p.satTemp_C));
    if (!hasP && !hasT) {
      results.push(validationResult('evaporator-pressure', 'ERROR', 'PRESSURE mode requires a valid vapor pressure (abs > 0) or saturation temperature (V-05).'));
    }
  }
  if (mode === 'FLOW_TEMP' && !Number.isFinite(parseFloat(p.flowOutTemp_C))) {
    results.push(validationResult('evaporator-flowtemp', 'ERROR', 'FLOW_TEMP mode requires the juice-out temperature to be set (V-06).'));
  }
  const hl = parseFloat(p.heatLossPct);
  if (Number.isFinite(hl) && (hl < 0 || hl >= 100)) {
    results.push(validationResult('evaporator-heatloss', 'ERROR', 'Heat Loss must satisfy 0 <= x < 100 %.'));
  }
  const ts = parseFloat(p.totalSolidsPct);
  if (Number.isFinite(ts) && ts !== 0 && (ts <= 0 || ts >= 100)) {
    results.push(validationResult('evaporator-totalsolids', 'ERROR', 'Total Solids must be 0 (unspecified) or strictly between 0 and 100 %.'));
  }
}

function validateHeatExchangerParameters(params, results) {
  const approach = params.approachK || '';
  if (approach && parseFloat(approach) < 1) {
    results.push(validationResult('heat-exchanger-approach', 'WARN', `Approach temperature ${approach}°K is unusually low`));
  }
}

function validateInjectionHeaterParameters(params, results) {
  const tempOut = params.temperatureOut || '';
  if (tempOut && parseFloat(tempOut) < 50) {
    results.push(validationResult('injection-heater-temp', 'WARN', `Outlet temperature ${tempOut}°C is unusually low`));
  }
}

function validateFlashTankParameters(params, results) {
  const pressure = params.flashPressure || '';
  if (pressure && parseFloat(pressure) < 10) {
    results.push(validationResult('flash-tank-pressure', 'WARN', `Flash pressure ${pressure} kPa is unusually low`));
  }
}

// --- Solver Execution Validation ----------------------------------------

export function validateSolverExecution(engineeringModel) {
  const results = [];

  // Check for disconnected streams
  const streams = engineeringModel.streams || [];
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i];
    const src = s.source?.equipmentId;
    const tgt = s.target?.equipmentId;

    if (src && !tgt) {
      results.push(validationResult('solver-stream-source-only', 'ERROR',
        `Stream ${s.id} has source but no target (requires outlet equipment)`));
    }

    if (!src && tgt) {
      results.push(validationResult('solver-stream-target-only', 'ERROR',
        `Stream ${s.id} has target but no source (requires inlet equipment)`));
    }
  }

  // Check for circular dependencies
  const circular = detectCircularDependencies(streams);
  if (circular.length) {
    results.push(validationResult('solver-circular-deps', 'ERROR',
      `Circular dependencies detected: ${circular.join(' → ')}`));
  }

  // Check mass balance closure
  const massBalanceResult = checkMassBalanceClosure(streams);
  if (massBalanceResult.status === 'ERROR') {
    results.push(validationResult('solver-mass-balance', massBalanceResult.status,
      massBalanceResult.message, massBalanceResult.details));
  } else if (massBalanceResult.status === 'WARN') {
    results.push(validationResult('solver-mass-balance', 'WARN', massBalanceResult.message, massBalanceResult.details));
  }

  return results;
}

function detectCircularDependencies(streams) {
  const graph = {};
  const visited = new Set();
  const stack = new Set();
  const cycles = [];

  // Build adjacency list
  for (const s of streams) {
    const src = s.source?.equipmentId;
    const tgt = s.target?.equipmentId;
    if (src && tgt) {
      if (!graph[src]) graph[src] = [];
      graph[src].push(tgt);
    }
  }

  function dfs(node, path) {
    if (!node) return;
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart).concat(node).join(' → '));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    for (const neighbor of graph[node] || []) {
      dfs(neighbor, [...path, node]);
    }
    stack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

function checkMassBalanceClosure(streams) {
  // Simple mass balance: sum of all incoming flows should equal sum of all outgoing flows
  // For now, just check that external streams have flow values
  const externalInputs = streams.filter(s => s.role === 'EXTERNAL_INPUT');
  const externalOutputs = streams.filter(s => s.role === 'PRODUCT_OUTPUT');
  const internalStreams = streams.filter(s => s.role === 'INTERNAL_FLOW');

  let errors = [];
  let warnings = [];

  for (const s of externalInputs) {
    const flow = parseFloat(s?.properties?.flow);
    if (!Number.isFinite(flow)) {
      errors.push(`External input ${s.id} missing flow specification`);
    } else if (flow < 0) {
      errors.push(`External input ${s.id} has negative flow`);
    }
  }

  for (const s of externalOutputs) {
    const flow = parseFloat(s?.properties?.flow);
    if (!Number.isFinite(flow)) {
      warnings.push(`External output ${s.id} missing flow specification`);
    } else if (flow < 0) {
      errors.push(`External output ${s.id} has negative flow`);
    }
  }

  if (errors.length) return { status: 'ERROR', message: `Mass balance validation failed: ${errors.join('; ')}`, details: { errors, warnings } };
  if (warnings.length) return { status: 'WARN', message: `Mass balance validation warnings: ${warnings.join('; ')}`, details: { errors, warnings } };

  return { status: 'OK', message: 'Mass balance validation passed', details: { errors, warnings } };
}

// --- Satellite Validation -----------------------------------------------

export function validateSatelliteData(satellite) {
  const results = [];

  // Check satellite integration quality
  if (!satellite.data || satellite.data.length === 0) {
    results.push(validationResult('satellite-data', 'WARN', 'No satellite data available for validation'));
  }

  // Check data completeness
  for (let i = 0; i < satellite.data?.length; i++) {
    const datum = satellite.data[i];
    if (!datum.timestamp) {
      results.push(validationResult('satellite-timestamp', 'WARN', `Data point ${i} missing timestamp`));
    }

    // Check for missing critical parameters
    if (!datum.parameters?.temperature && !datum.parameters?.pressure) {
      results.push(validationResult('satellite-parameters', 'WARN', `Data point ${i} missing temperature and pressure readings`));
    }
  }

  return results;
}

// --- Export for use -------------------------------------------------------

export { validationResult, validationSummary, validateStream, validateEquipment, validateSolverExecution,
  validateSatelliteData, satTempCFromKPa };

// Re-export validation utilities from other modules
export { streamBoundaryType } from '../sugar/streams.js';
export { satTempCFromKPa } from '../sugar/calculations.js';
export { connectorTopologyIssues } from '../diagram/connectors.js';