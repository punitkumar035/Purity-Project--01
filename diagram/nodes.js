/**
 * diagram/nodes.js — Node rendering, styling, and DOM element creation.
 *
 * Exported functions operate on node objects and element references.
 * No persistent state – lightweight UI helpers only.
 */

// --- Rendering ----------------------------------------------------------

export function renderNodeHTML(node, opts = {}) {
  const def = nodeDefs[node.type] || {};
  const title = node.label || def.title || node.type;
  const icon = def.icon || '□';
  const stationNumber = node.stationNumber || '—';
  const equipmentTag = node.equipmentTag || '—';
  const statusClass = solverStatusClass(node.solveStatus);
  const statusLabel = solverStatusChip(node.solveStatus);

  const inputs = (def.inputs || []).map(p => ({
    id: p.id, name: p.name, accept: p.accept, category: p.category, side: p.side
  }));
  const outputs = (def.outputs || []).map(p => ({
    id: p.id, name: p.name, accept: p.accept, category: p.category, side: p.side
  }));

  const inputHTML = inputs.map(p => `
    <div class="port port-in" data-port="${p.id}" title="${p.name}">
      <span class="port-dot"></span>
      <span class="port-label">${p.id}</span>
    </div>`).join('');
  const outputHTML = outputs.map(p => `
    <div class="port port-out" data-port="${p.id}" title="${p.name}">
      <span class="port-dot"></span>
      <span class="port-label">${p.id}</span>
    </div>`).join('');

  const boundary = node.type === 'source' ? ' boundary-source' : '';
  const selectedClass = opts.selected ? ' selected' : '';

  return `
    <div class="node${boundary}${selectedClass}" data-node-id="${node.id}">
      <div class="node-header">
        <div class="node-icon">${icon}</div>
        <div class="node-title">
          <div class="node-label" title="User-defined label">${title}</div>
          <div class="node-meta">
            <span>#${stationNumber}</span>
            <span>•</span>
            <span>${equipmentTag}</span>
          </div>
        </div>
        <div class="node-status ${statusClass}">${statusLabel}</div>
      </div>
      <div class="node-body">
        <div class="port-side left">
          ${inputHTML}
        </div>
        <div class="port-side right">
          ${outputHTML}
        </div>
      </div>
    </div>`;
}

export function updateNodeSelection(nodeId, selected, container) {
  const nodeEl = container.querySelector(`.node[data-node-id="${nodeId}"]`);
  if (!nodeEl) return;
  if (selected) nodeEl.classList.add('selected');
  else nodeEl.classList.remove('selected');
}

// --- State Mapping Helpers -----------------------------------------------

function nodeDefs(def = {}) {
  return {
    source: { title: 'External Flow', icon: 'F', inputs: [], outputs: [{ id: 'out', name: 'Stream', category: 'dynamic' }] },
    pan: { title: 'Massecuite Pan', icon: 'P', inputs: [{ id: 'steam', name: 'Steam / Heating Vapour', accept: 'thermal' }, { id: 'syrup', name: 'Syrup / Process Feed', accept: 'material' }], outputs: [{ id: 'vapour', name: 'Vapour', category: 'thermal' }, { id: 'condensate', name: 'Condensate', category: 'condensate' }, { id: 'mc', name: 'Massecuite', category: 'material' }] },
    crystallizer: { title: 'Massecuite Crystallizer', icon: 'Cr', inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }], outputs: [{ id: 'mcOut', name: 'Crystallized Massecuite', category: 'material' }] },
    centrifugal2: { title: '2-Output Centrifugal', icon: 'C2', inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }, { id: 'wash', name: 'Wash', accept: 'any' }], outputs: [{ id: 'sugar', name: 'Sugar', category: 'material' }, { id: 'green', name: 'Green Mol.', category: 'material' }] },
    centrifugal3: { title: '3-Output Centrifugal', icon: 'C3', inputs: [{ id: 'mc', name: 'Massecuite', accept: 'massecuite' }, { id: 'wash', name: 'Wash', accept: 'any' }], outputs: [{ id: 'sugar', name: 'Sugar', category: 'material' }, { id: 'green', name: 'Green Mol.', category: 'material' }, { id: 'light', name: 'Wash Mol.', category: 'material' }] },
    magma: { title: 'Magma Mixer', icon: 'Mg', inputs: [{ id: 'sugar', name: 'Sugar In', accept: 'material', side: 'left' }, { id: 'diluent', name: 'Diluent / Syrup In', accept: 'material', side: 'left' }], outputs: [{ id: 'magma', name: 'Magma Out', category: 'material', side: 'right' }] },
    melter: { title: 'Sugar Melter', icon: 'Me', inputs: [{ id: 'sugar', name: 'Sugar / Magma Feeds (Ports 0-8)', accept: 'material', side: 'left' }, { id: 'medium', name: 'Diluent Solvent In (Port 9)', accept: 'material', side: 'left' }, { id: 'steam', name: 'Heating Steam In (Port 10)', accept: 'thermal', side: 'top' }], outputs: [{ id: 'melt', name: 'Melt Liquor Out', category: 'material', side: 'right' }, { id: 'condensate', name: 'Coil Condensate Out', category: 'condensate', side: 'bottom' }] },
    source: { title: 'External Flow', icon: 'F', hidden: true },
    sink: { title: 'Product / Sink', icon: '→', hidden: true }
  };
}

export function getNodeDef(type) {
  return nodeDefs()[type];
}

export function nodeVisualSize(node) {
  return { width: 220, height: 140 };
}

export function portPosition(node, portId, hint = null) {
  const def = getNodeDef(node.type);
  const input = (def.inputs || []).find(p => p.id === portId);
  const output = (def.outputs || []).find(p => p.id === portId);
  const port = input || output;
  if (!port) return null;
  const size = nodeVisualSize(node);
  if (port.side === 'left') return { x: 0, y: size.height * 0.33 };
  if (port.side === 'right') return { x: size.width, y: size.height * 0.67 };
  if (port.side === 'top') return { x: size.width * 0.5, y: 0 };
  if (port.side === 'bottom') return { x: size.width * 0.5, y: size.height };
  return null;
}

function solverStatusClass(status) {
  switch (status) {
    case 'SOLVED': return 'node-solved';
    case 'READY': return 'node-ready';
    case 'FAIL': return 'node-fail';
    case 'PENDING': return 'node-pending';
    case 'UNCONNECTED': return 'node-unconnected';
    case 'INVALID': return 'node-invalid';
    case 'UNSOLVED': return 'node-unsolved';
    default: return 'node-default';
  }
}

function solverStatusChip(status) {
  switch (status) {
    case 'SOLVED': return '✓';
    case 'READY': return '→';
    case 'FAIL': return '✗';
    case 'PENDING': return '⏳';
    case 'UNCONNECTED': return '○';
    case 'INVALID': return '⚠';
    case 'UNSOLVED': return '○';
    default: return '•';
  }
}