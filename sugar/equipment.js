/**
 * sugar/equipment.js — Sugar Engineering Equipment Model.
 *
 * Domain-specific equipment definitions, port layouts, and station numbering.
 * Pure functions operating on plain objects. No DOM dependencies.
 *
 * This module owns the authoritative Sugar equipment model. The diagram engine
 * imports from this module to render nodes and validate port compatibility.
 */

// --- Equipment Type Definitions -------------------------------------------

export const EQUIPMENT_TAG_PREFIX = {
  source: 'EXT', pan: 'PAN', crystallizer: 'CRY', centrifugal2: 'CEN2', centrifugal3: 'CEN3',
  magma: 'MAG', melter: 'MLT', mixer: 'MIX', splitter: 'DST', distributor: 'DST', receiver: 'RCV', sink: 'PROD',
  seed: 'SEED', wash: 'WASH', clearjuice: 'CJ', hotwater: 'HW',
  evaporator: 'EVAP', heater: 'HTR', injectionHeater: 'INJ', flashTank: 'FLT',
  cooler: 'CLR', dryer: 'DRY', compressor: 'CMP', thermocompressor: 'TCM',
  turbine: 'TRB', turboAlternator: 'TBA', pump: 'PMP', pressureReducer: 'PRV',
  contactCondenser: 'CND', surfaceCondenser: 'SCD', reactor: 'RCT', separator: 'FLT', tank: 'TNK'
};

export const SUGARS_STATION_TYPE_CODE = {
  mixer: '1', centrifugal2: '2A', centrifugal3: '2B', crystallizer: '6', splitter: '7', distributor: '7',
  melter: '16', pan: '14', receiver: '18', magma: '1', evaporator: '9', heater: '12', injectionHeater: '13', flashTank: '10',
  cooler: '4', dryer: '8', compressor: '3', thermocompressor: '23', turbine: '24', turboAlternator: '25',
  pump: '17', pressureReducer: '15', contactCondenser: '5', surfaceCondenser: '21', reactor: '19', separator: '20', tank: '22',
  source: 'BOUNDARY', sink: 'BOUNDARY',
  seed: 'BOUNDARY', wash: 'BOUNDARY', clearjuice: 'BOUNDARY', hotwater: 'BOUNDARY'
};

// --- Equipment Node Definition (minimal subset) --------------------------

/**
 * Get the port definition for an equipment type.
 * Returns {inputs, outputs} arrays where each port has: id, name, accept, category, side
 */
export function getEquipmentDef(type) {
  switch (type) {
    case 'pan':
      return {
        inputs: [{ id: 'steam', name: 'Steam / Heating Vapour', accept: 'thermal', side: 'left' },
                 { id: 'syrup', name: 'Syrup / Process Feed', accept: 'material', side: 'left' }],
        outputs: [{ id: 'vapour', name: 'Vapour', category: 'thermal', side: 'right' },
                  { id: 'condensate', name: 'Condensate', category: 'condensate', side: 'right' },
                  { id: 'mc', name: 'Massecuite', category: 'material', side: 'right' }]
      };
    case 'crystallizer':
      return {
        inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }],
        outputs: [{ id: 'mcOut', name: 'Crystallized Massecuite', category: 'material' }]
      };
    case 'centrifugal2':
      return {
        inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }, { id: 'wash', name: 'Wash', accept: 'any' }],
        outputs: [{ id: 'sugar', name: 'Sugar', category: 'material' }, { id: 'green', name: 'Green Mol.', category: 'material' }]
      };
    case 'centrifugal3':
      return {
        inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }, { id: 'wash', name: 'Wash', accept: 'any' }],
        outputs: [{ id: 'sugar', name: 'Sugar', category: 'material' }, { id: 'green', name: 'Green Mol.', category: 'material' }, { id: 'light', name: 'Wash Mol.', category: 'material' }]
      };
    case 'magma':
      return {
        inputs: [{ id: 'sugar', name: 'Sugar In', accept: 'material', side: 'left' },
                 { id: 'diluent', name: 'Diluent / Syrup In', accept: 'material', side: 'left' }],
        outputs: [{ id: 'magma', name: 'Magma Out', category: 'material', side: 'right' }]
      };
    case 'melter':
      return {
        inputs: [{ id: 'sugar', name: 'Sugar / Magma Feeds (Ports 0-8)', accept: 'material', side: 'left' },
                 { id: 'medium', name: 'Diluent Solvent In (Port 9)', accept: 'material', side: 'left' },
                 { id: 'steam', name: 'Heating Steam In (Port 10)', accept: 'thermal', side: 'top' }],
        outputs: [{ id: 'melt', name: 'Melt Liquor Out', category: 'material', side: 'right' },
                  { id: 'condensate', name: 'Coil Condensate Out', category: 'condensate', side: 'bottom' }]
      };
    case 'evaporator':
      return {
        inputs: [{ id: 'in1', name: 'Steam / Vapor In', accept: 'thermal', side: 'left' },
                 { id: 'in0', name: 'Juice In', accept: 'material', side: 'left' }],
        outputs: [{ id: 'out1', name: 'Vapor Out', category: 'thermal', side: 'top' },
                  { id: 'out2', name: 'Condensate Out', category: 'condensate', side: 'bottom' },
                  { id: 'out0', name: 'Juice / Syrup Out', category: 'material', side: 'right' }]
      };
    case 'heater':
      return {
        inputs: [{ id: 'juice', name: 'Juice In (Port 0)', accept: 'material', side: 'left' },
                 { id: 'steam', name: 'Heating Steam / Vapour (Port 1)', accept: 'thermal', side: 'top' }],
        outputs: [{ id: 'juiceOut', name: 'Heated Juice Out (Port 0)', category: 'material', side: 'right' },
                  { id: 'condensate', name: 'Condensate Out (Port 1)', category: 'condensate', side: 'bottom' }]
      };
    case 'source':
      return { inputs: [], outputs: [{ id: 'out', name: 'Stream', category: 'dynamic' }] };
    case 'sink':
      return { inputs: [{ id: 'in', name: 'Product / Utility', accept: 'any' }], outputs: [] };
    default:
      return { inputs: [], outputs: [] };
  }
}

// --- Station Numbering ----------------------------------------------------

/**
 * Return the valid station number range for an equipment type.
 * Returns [lo, hi] inclusive bounds.
 */
export function stationNumberBlock(type) {
  const blockedTypes = ['source', 'sink', 'seed', 'wash', 'clearjuice', 'hotwater'];
  if (blockedTypes.includes(type)) return [9000, 9999];
  const stationRanges = {
    pan: [4000, 4999], crystallizer: [4000, 4999], centrifugal2: [4000, 4999], centrifugal3: [4000, 4999],
    magma: [100, 9999], melter: [4000, 4999], mixer: [100, 999], splitter: [100, 999],
    distributor: [100, 999], receiver: [4000, 4999], source: [9000, 9999], sink: [9000, 9999],
    seed: [9000, 9999], wash: [9000, 9999], clearjuice: [9000, 9999], hotwater: [9000, 9999],
    evaporator: [4000, 4999], heater: [4000, 4999], injectionHeater: [4000, 4999], flashTank: [4000, 4999],
    cooler: [4000, 4999], dryer: [4000, 4999], compressor: [100, 999], thermocompressor: [100, 999],
    turbine: [100, 999], turboAlternator: [100, 999], pump: [100, 999], pressureReducer: [100, 999],
    contactCondenser: [4000, 4999], surfaceCondenser: [4000, 4999], reactor: [4000, 4999],
    separator: [4000, 4999], tank: [4000, 4999]
  };
  return stationRanges[type] || [100, 9999];
}

/**
 * Return the station type code for an equipment type.
 * Used for display in the header bar.
 */
export function stationTypeCode(type) {
  return SUGARS_STATION_TYPE_CODE[type] || 'CUSTOM';
}

/**
 * Get the tag prefix for an equipment type (e.g., 'PAN-0014' → prefix = 'PAN')
 */
export function equipmentTagPrefix(type) {
  return EQUIPMENT_TAG_PREFIX[type] || String(type || 'EQ').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'EQ';
}

/**
 * Generate a new equipment tag for a given type and station number.
 * Format: {PREFIX}-{NNNN}, e.g., PAN-0014
 */
export function suggestedEquipmentTag(type, stationNumber) {
  return `${equipmentTagPrefix(type)}-${String(Number(stationNumber) || 0).padStart(4, '0')}`;
}

/**
 * Check if a given equipment tag is already in use across nodes.
 */
export function equipmentTagAvailable(tag, excludeNodeId = null, nodes = []) {
  const t = String(tag || '').trim().toUpperCase();
  if (!t) return false;
  return !nodes.some(n => n.id !== excludeNodeId && String(n.equipmentTag || '').trim().toUpperCase() === t);
}

/**
 * Generate the next available equipment tag for a node type.
 * Walks the numbering block to find the next free slot.
 */
export function nextEquipmentTag(type, excludeNodeId = null, stationNumber = null, nodes = []) {
  const n = stationNumber || nextStationNumber(type, excludeNodeId, nodes);
  const base = suggestedEquipmentTag(type, n);
  if (equipmentTagAvailable(base, excludeNodeId)) return base;
  const prefix = equipmentTagPrefix(type);
  let i = 1;
  while (i < 10000) {
    const t = `${prefix}-${String(n).padStart(4, '0')}-${i}`;
    if (equipmentTagAvailable(t, excludeNodeId)) return t;
    i++;
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

/**
 * Compute the next available station number for an equipment type.
 */
export function nextStationNumber(type, excludeNodeId = null, nodes = []) {
  const [lo, hi] = stationNumberBlock(type);
  const used = new Set((nodes || [])
    .filter(n => n.id !== excludeNodeId)
    .map(n => Number(n.stationNumber))
    .filter(Number.isInteger));

  // Try stepping by 10 first (consistent with the original code)
  for (let n = lo + 10; n <= hi; n += 10) {
    if (!used.has(n)) return n;
  }
  // Then try every number
  for (let n = lo + 1; n <= hi; n++) {
    if (!used.has(n)) return n;
  }
  // Last resort: find any number 1-9999 not used
  for (let n = 1; n <= 9999; n++) {
    if (!used.has(n)) return n;
  }
  throw new Error(`No station numbers available in 1–9999 for type ${type}`);
}

// --- Dependency Separation ------------------------------------------------

/**
 * Is this equipment a boundary node that should not have a station solver?
 */
export function isBoundaryNode(type) {
  const boundaryTypes = ['source', 'sink', 'seed', 'wash', 'clearjuice', 'hotwater'];
  return boundaryTypes.includes(type);
}

/**
 * Check if equipment type has a station solver available.
 */
export function hasStationSolver(type) {
  // All core equipment types have station solvers;
  // boundary and generic types do not.
  const solverTypes = ['pan', 'crystallizer', 'centrifugal2', 'centrifugal3', 'magma',
    'melter', 'mixer', 'splitter', 'distributor', 'receiver', 'evaporator',
    'heater', 'injectionHeater', 'flashTank', 'cooler', 'dryer',
    'compressor', 'thermocompressor', 'turbine', 'turboAlternator',
    'pump', 'pressureReducer', 'contactCondenser', 'surfaceCondenser',
    'reactor', 'separator', 'tank'];
  return solverTypes.includes(type);
}

/**
 * Validate that an equipment node has the minimum required fields.
 */
export function validateEquipmentNode(node) {
  const errors = [];
  if (!node || !node.type) errors.push('Missing equipment type');
  else if (!nodeDefs()[node.type]) errors.push(`Unknown equipment type: ${node.type}`);

  if (node.type && !isBoundaryNode(node.type)) {
    if (node.stationNumber === undefined || node.stationNumber === null) errors.push('Missing station number');
    if (!node.equipmentTag || node.equipmentTag.trim() === '') errors.push('Missing equipment tag');
  }

  return errors.length ? errors : null;
}

function nodeDefs() {
  return {
    pan: true, crystallizer: true, centrifugal2: true, centrifugal3: true,
    magma: true, melter: true, evaporator: true, heater: true,
    source: true, sink: true, seed: true, wash: true, clearjuice: true, hotwater: true
  };
}

// Export all
export { EQUIPMENT_TAG_PREFIX, SUGARS_STATION_TYPE_CODE, getEquipmentDef, stationNumberBlock, stationTypeCode,
  equipmentTagPrefix, suggestedEquipmentTag, nextEquipmentTag, equipmentTagAvailable, nextStationNumber,
  isBoundaryNode, hasStationSolver, validateEquipmentNode };