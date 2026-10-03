/**
 * sugar/streams.js — Process Stream Model & Component Ledger.
 *
 * Canonical stream representation with mass balance, composition, and
 * engineering properties. Pure functions, no DOM dependencies.
 */

// --- Stream Creation ------------------------------------------------------

export function createStream({ source, target, id, name, medium = 'Syrup', properties = {}, components = {} }) {
  return {
    id: id || `stream_${Date.now()}`,
    name: name || 'Stream',
    medium,
    source: source || {}, // { equipmentId, portId }
    target: target || {}, // { equipmentId, portId }
    properties: {
      flow: '',              // kg/h
      temperature: '',       // °C
      pressureAbs: '',       // kPa absolute
      brix: '',              // °Bx
      purity: '',            // %
      colour: '',            // ICUMSA
      ph: '',                // pH
      drynessFraction: '1.0', // steam quality
      steamStateMode: 'SATURATED',
      ...properties
    },
    components: {
      water: '', sucrose: '', invert: '', ash: '', ns1: '', ns2: '',
      crystals: '', caco3: '', cao: '', fiber: '',
      steamVapour: '', ethanolL: '', ethanolG: '', co2: '', ammonia: '',
      ...components
    },
    solubility: { a: '', b: '', c: '', basis: '' },
    propertyMethods: {
      juiceCpMethod: 'HUGOT_T_PURITY',
      cpUserKJkgK: '',
      juiceDensityMethod: 'LYLE_1957_PURE_SUCROSE_EQ32_8',
      densityUserKgM3: '',
      bpeMethod: 'BPE_SASKA_ASI_2002_EQ8',
      bpeUserK: ''
    },
    routing: {
      mode: 'auto',          // 'auto' | 'manual'
      vertices: []           // manual route points [{x, y}, ...]
    },
    solveStatus: 'UNSOLVED',
    solverMessage: '',
    requiredPath: [],
    pressurePath: []
  };
}

// --- Component Summary & Mass Balance -------------------------------------

/**
 * Sum all component percentages and return the total mass % and individual flows.
 */
export function computeComponentTotals(stream, totalFlow = 0) {
  const comps = stream?.components || {};
  const keys = Object.keys(comps);
  const massPcts = {};
  let totalPct = 0;
  for (const k of keys) {
    const v = parseFloat(comps[k]);
    if (Number.isFinite(v) && v > 0) {
      massPcts[k] = v;
      totalPct += v;
    }
  }
  const flow = parseFloat(stream?.properties?.flow);
  const totalMassKgH = Number.isFinite(flow) ? flow : totalFlow;
  const flows = {};
  for (const k of Object.keys(massPcts)) {
    flows[k] = totalMassKgH * massPcts[k] / 100;
  }
  return { massPcts, flows, totalPct, totalMassKgH };
}

/**
 * Return liquid/solid/gas phase splits from component ledger.
 */
export function computePhaseSplit(stream) {
  const comps = stream?.components || {};
  const liquidKeys = ['water', 'ethanolL', 'sucrose', 'invert', 'ash', 'ns1', 'ns2'];
  const solidKeys = ['crystals', 'caco3', 'cao', 'fiber'];
  const gasKeys = ['steamVapour', 'ethanolG', 'co2', 'ammonia'];

  const sum = (keys) => keys.reduce((a, k) => a + (parseFloat(comps[k]) || 0), 0);

  return {
    liquidPct: sum(liquidKeys),
    solidPct: sum(solidKeys),
    gasPct: sum(gasKeys),
    liquidKeys, solidKeys, gasKeys
  };
}

/**
 * Derive brix, purity, DS, TDM, and sugar fractions from components.
 */
export function deriveStreamProperties(stream) {
  const { massPcts, totalPct } = computeComponentTotals(stream);
  const liquidKeys = ['water', 'ethanolL', 'sucrose', 'invert', 'ash', 'ns1', 'ns2'];
  const solidKeys = ['crystals', 'caco3', 'cao', 'fiber'];

  const liquidPct = liquidKeys.reduce((a, k) => a + (massPcts[k] || 0), 0);
  const dissolvedSolidsPct = (massPcts.sucrose || 0) + (massPcts.invert || 0) + (massPcts.ash || 0) + (massPcts.ns1 || 0) + (massPcts.ns2 || 0);
  const crystalPct = massPcts.crystals || 0;
  const insolublePct = (massPcts.caco3 || 0) + (massPcts.cao || 0) + (massPcts.fiber || 0);
  const tdmPct = dissolvedSolidsPct + insolublePct + crystalPct;
  const sugarPct = (massPcts.sucrose || 0) + crystalPct;

  const liquidBrixPct = liquidPct > 0 ? 100 * dissolvedSolidsPct / liquidPct : 0;
  const truePurityPct = dissolvedSolidsPct > 0 ? 100 * (massPcts.sucrose || 0) / dissolvedSolidsPct : 0;
  const sugarPhaseDryPct = dissolvedSolidsPct + crystalPct;
  const sugarPhaseWetPct = (massPcts.water || 0) + sugarPhaseDryPct;
  const overallDS = sugarPhaseWetPct > 0 ? 100 * sugarPhaseDryPct / sugarPhaseWetPct : 0;
  const overallPurity = sugarPhaseDryPct > 0 ? 100 * sugarPct / sugarPhaseDryPct : 0;

  return {
    liquidPct, solidPct: (solidKeys.reduce((a, k) => a + (massPcts[k] || 0), 0)), gasPct: 0,
    dissolvedSolidsPct, crystalPct, insolublePct, tdmPct, sugarPct,
    liquidBrixPct, truePurityPct, overallDS, overallPurity
  };
}

// --- Stream Boundary Classification ---------------------------------------

/**
 * Determine the boundary role of a stream from its topology:
 * - EXTERNAL_INPUT: source is blank canvas (no equipment)
 * - INTERNAL_FLOW: source equipment → target equipment
 * - PRODUCT_OUTPUT: target is blank canvas
 * - FREE: both ends unconnected (universal flow stencil)
 */
export function streamBoundaryType(stream) {
  if (!stream) return 'UNKNOWN';
  const src = stream.source || {};
  const tgt = stream.target || {};

  // Check for port attachments (preferred)
  const hasSrcPort = src.equipmentId && src.portId;
  const hasTgtPort = tgt.equipmentId && tgt.portId;

  if (hasSrcPort && hasTgtPort) return 'INTERNAL_FLOW';
  if (!hasSrcPort && hasTgtPort) return 'EXTERNAL_INPUT';
  if (hasSrcPort && !hasTgtPort) return 'PRODUCT_OUTPUT';
  return 'FREE';
}

/**
 * Check if stream carries steam/vapour (water/steam phase).
 */
export function streamHasSteamVapour(stream) {
  const c = stream?.components || {};
  return (parseFloat(c.steamVapour) || 0) > 0 ||
         (parseFloat(c.ethanolG) || 0) > 0 ||
         (parseFloat(c.co2) || 0) > 0 ||
         (parseFloat(c.ammonia) || 0) > 0;
}

/**
 * Check if stream is pure water phase (wash water, condensate, etc.)
 */
export function isPureWaterPhase(stream) {
  const c = stream?.components || {};
  const water = parseFloat(c.water) || 0;
  const total = Object.values(c).reduce((a, v) => a + (parseFloat(v) || 0), 0);
  return total > 0 && water / total > 0.99;
}

// --- Stream Validation ----------------------------------------------------

export function validateStream(stream) {
  const errors = [];
  if (!stream) return ['No stream object'];

  const bt = streamBoundaryType(stream);
  if (bt === 'FREE') errors.push('Stream is not connected at either end');
  if (bt === 'UNKNOWN') errors.push('Stream topology unknown');

  // Check required properties based on boundary type
  if (bt === 'EXTERNAL_INPUT' || bt === 'PRODUCT_OUTPUT') {
    const flow = parseFloat(stream.properties?.flow);
    if (!Number.isFinite(flow)) errors.push('External streams require flow specification');
  }

  // Component sum check
  const { totalPct } = computeComponentTotals(stream);
  if (totalPct > 100.1) errors.push(`Component sum ${totalPct.toFixed(2)}% exceeds 100%`);

  return errors.length ? errors : null;
}

// --- Connector ↔ Stream Adapter -------------------------------------------

/**
 * Convert a diagram connector object to an engineering stream object.
 * Used by the solver to build the engineering model from diagram topology.
 */
export function connectorToStream(connector, nodes) {
  if (!connector) return null;

  const sourceNode = nodes?.find(n => n.id === connector.fromNodeId);
  const targetNode = nodes?.find(n => n.id === connector.toNodeId);

  return createStream({
    id: connector.id,
    name: connector.name,
    medium: connector.mediumType || 'Syrup',
    source: {
      equipmentId: connector.fromNodeId,
      portId: connector.fromPortId
    },
    target: {
      equipmentId: connector.toNodeId,
      portId: connector.toPortId
    },
    properties: connector.properties || {},
    components: connector.components || {},
    solubility: connector.solubility || { a: '', b: '', c: '', basis: '' },
    propertyMethods: connector.propertyMethods || {}
  });
}

/**
 * Convert an engineering stream object to a diagram connector.
 * Used when persisting to diagram state.
 */
export function streamToConnector(stream, state) {
  if (!stream) return null;

  return {
    id: stream.id,
    fromNodeId: stream.source?.equipmentId,
    fromPortId: stream.source?.portId,
    toNodeId: stream.target?.equipmentId,
    toPortId: stream.target?.portId,
    name: stream.name,
    mediumType: stream.medium,
    properties: stream.properties,
    components: stream.components,
    solubility: stream.solubility,
    propertyMethods: stream.propertyMethods,
    params: stream.routing || {},
    solver: {
      solveStatus: stream.solveStatus || 'UNSOLVED',
      solverMessage: stream.solverMessage || ''
    },
    requiredPath: stream.requiredPath || [],
    pressurePath: stream.pressurePath || []
  };
}

export { createStream, computeComponentTotals, computePhaseSplit, deriveStreamProperties,
  streamBoundaryType, streamHasSteamVapour, isPureWaterPhase, validateStream,
  connectorToStream, streamToConnector };