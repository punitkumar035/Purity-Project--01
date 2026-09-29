/**
 * diagram/ports.js — Port definitions, compatibility, and snapping logic.
 *
 * Exports pure functions that operate on plain objects. No DOM dependencies.
 * Used by the connector engine to validate attachments and render snap feedback.
 */

export const nodeDefs = {
  source: {
    title: 'External Flow', icon: 'F',
    inputs: [], outputs: [{ id: 'out', name: 'Stream', category: 'dynamic' }],
    defaults: { mediumType: 'Syrup', flow: '', brix: '', purity: '', colour: '', temperature: '', pressureAbs: '', drynessFraction: '1.0', steamStateMode: 'SATURATED', notes: '' }
  },
  pan: {
    title: 'Massecuite Pan', icon: 'P',
    inputs: [
      { id: 'steam', name: 'Steam / Heating Vapour', accept: 'thermal' },
      { id: 'syrup', name: 'Syrup / Process Feed', accept: 'material' }
    ],
    outputs: [
      { id: 'vapour', name: 'Vapour', category: 'thermal' },
      { id: 'condensate', name: 'Condensate', category: 'condensate' },
      { id: 'mc', name: 'Massecuite', category: 'material' }
    ],
    defaults: {
      operationMode: 'CONTINUOUS', solidsControl: 'MASSECUITE_DS', targetMassecuiteDS: '',
      outputSupersaturation: '', targetMLPurity: '', minMassecuiteDS: '', maxMassecuiteDS: '',
      pressureMode: 'VAPOUR_PRESSURE', panVapourPressure: '', vapourSaturationTemperature: '',
      massecuiteTemperature: '', bpeMethod: 'BUBNIK_KADLEC_1995_TECHNICAL', legacyBPEFactor: '',
      bpeTolerance: '0.000001', entrainmentPpm: '0', entrainmentBasis: 'CONDENSABLE_VAPOUR',
      entrainmentTolerance: '0.000001', entrainmentMaxIterations: '100',
      colourRiseMode: 'NONE', colourRisePercent: '0', colourRiseAbsolute: '0',
      heatLoss: '0', condensateSubcooling: '0', crystallizationHeatMode: 'OFF', crystallizationHeatReleased: '0',
      uaMode: 'CHECK_ONLY', overallU: '', installedArea: '', deltaTOther: '0',
      solubilityBasis: 'Cane Values (Typical)', coefA: '0.0400', coefB: '0.7100', coefC: '-2.1000', notes: ''
    }
  },
  // Minimal subset — full defs remain in main.js nodeDefs; this file re-exports the shape.
  crystallizer: {
    title: 'Massecuite Crystallizer', icon: 'Cr',
    inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }],
    outputs: [{ id: 'mcOut', name: 'Crystallized Massecuite', category: 'material' }],
    defaults: { outputTemperature: '', targetSupersaturation: '', solubilityMode: 'INHERIT_STREAM', solubilityBasis: 'Custom / Approved', coefA: '', coefB: '', coefC: '', colourRise: '', notes: '' }
  },
  centrifugal2: {
    title: '2-Output Centrifugal', icon: 'C2',
    inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }, { id: 'wash', name: 'Wash', accept: 'any' }],
    outputs: [{ id: 'sugar', name: 'Sugar', category: 'material' }, { id: 'green', name: 'Green Mol.', category: 'material' }],
    defaults: { mode: 'Helpbook evaluation', machineType: 'Continuous', washRatio: '', notes: '', centrifugal: null }
  },
  centrifugal3: {
    title: '3-Output Centrifugal', icon: 'C3',
    inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }, { id: 'wash', name: 'Wash', accept: 'any' }],
    outputs: [{ id: 'sugar', name: 'Sugar', category: 'material' }, { id: 'green', name: 'Green Mol.', category: 'material' }, { id: 'light', name: 'Wash Mol.', category: 'material' }],
    defaults: { mode: 'Helpbook evaluation', machineType: 'Batch', washRatio: '', notes: '', centrifugal: null }
  },
  magma: {
    title: 'Magma Mixer', icon: 'Mg',
    inputs: [
      { id: 'sugar', name: 'Sugar In', accept: 'material', side: 'left' },
      { id: 'diluent', name: 'Diluent / Syrup In', accept: 'material', side: 'left' }
    ],
    outputs: [{ id: 'magma', name: 'Magma Out', category: 'material', side: 'right' }],
    defaults: { targetBrix: '88', diluentType: 'Syrup', notes: '' }
  },
  melter: {
    title: 'Sugar Melter', icon: 'Me',
    inputs: [
      { id: 'sugar', name: 'Sugar / Magma Feeds (Ports 0-8)', accept: 'material', side: 'left' },
      { id: 'medium', name: 'Diluent Solvent In (Port 9)', accept: 'material', side: 'left' },
      { id: 'steam', name: 'Heating Steam In (Port 10)', accept: 'thermal', side: 'top' }
    ],
    outputs: [
      { id: 'melt', name: 'Melt Liquor Out', category: 'material', side: 'right' },
      { id: 'condensate', name: 'Coil Condensate Out', category: 'condensate', side: 'bottom' }
    ],
    defaults: {
      holdTdmPct: '67.0', targetBrix: '67.0', temperatureOut: '85.0', targetTemp: '85.0',
      heatingType: 'INJECTION', heatLossPercent: '1.0', colorRise: '5.0', requiredFlowInletId: 'sugar', notes: ''
    }
  },
  source: { title: 'External Flow', icon: 'F', hidden: true },
  sink: { title: 'Product / Sink', icon: '→', hidden: true }
};

// Convenience: ensure every equipment def has side assignment on inputs/outputs
export function assignPortSides(defs) {
  Object.values(defs || {}).forEach(def => {
    (def.inputs || []).forEach(p => { if (!p.side) p.side = 'left'; });
    (def.outputs || []).forEach(p => { if (!p.side) p.side = 'right'; });
  });
}

// Port compatibility: given an endpoint definition and a port definition,
// return { ok, message, dir } where dir is 'in' | 'out'
export function portCompatibilityForEndpoint(candidatePortDef, endpointObj) {
  if (!candidatePortDef) return { ok: false, message: 'No port definition found', dir: null };
  if (!endpointObj) return { ok: false, message: 'No endpoint object', dir: null };

  const inputs = candidatePortDef.inputs || [];
  const outputs = candidatePortDef.outputs || [];

  // Check if this port matches any input
  const inputMatch = inputs.find(p => p.id === endpointObj.port_id);
  if (inputMatch) return { ok: true, message: '', dir: 'in' };

  // Check if this port matches any output
  const outputMatch = outputs.find(p => p.id === endpointObj.port_id);
  if (outputMatch) return { ok: true, message: '', dir: 'out' };

  return { ok: false, message: 'Port ID does not match equipment definition', dir: null };
}

// Port snapping: given a mouse/pointer position and a list of candidate ports,
// return the best matching port or null
export function visiblePortCandidates(mouseX, mouseY, portElements, tolerance = 20) {
  const candidates = [];
  portElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const dx = Math.max(0, rect.left - mouseX, mouseX - rect.right);
    const dy = Math.max(0, rect.top - mouseY, mouseY - rect.bottom);
    const dist = Math.hypot(dx, dy);
    if (dist <= tolerance) {
      candidates.push({ el, dist, rect });
    }
  });
  // Sort by distance (closest first)
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates.length ? candidates : null;
}

export function hitTestPortScreen(clientX, clientY, portElements, tolerance = 20) {
  return visiblePortCandidates(clientX, clientY, portElements, tolerance);
}

// Routing helpers: orthogonal base with optional obstacle avoidance
export function routeOrthogonalBase(sx, sy, ex, ey, gap = 50) {
  // Simple orthogonal: horizontal then vertical, with gap offset
  const dx = ex - sx;
  const dy = ey - sy;
  const midX = sx + dx / 2;
  const midY = sy + dy / 2;
  // Offset by gap to avoid endpoints
  const offsetX = (dx > 0 ? 1 : dx < 0 ? -1 : 0) * gap;
  const offsetY = (dy > 0 ? 1 : dy < 0 ? -1 : 0) * gap;
  return [
    { x: sx, y: sy },
    { x: midX + offsetX, y: sy },
    { x: midX + offsetX, y: midY + offsetY },
    { x: midX, y: midY + offsetY },
    { x: ex, y: ey }
  ];
}