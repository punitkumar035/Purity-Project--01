/**
 * export/json_export.js — JSON export for multi-page projects.
 *
 * Exports complete project state as JSON.
 * Pure functions on plain objects. No DOM dependencies.
 */

export function exportAllPages(state) {
  const pages = state.pages.map(page => ({
    id: page.id,
    name: page.name,
    layout: page.layout || 'A4',
    orientation: page.orientation || 'landscape',
    zoom: page.zoom || 1,
    panX: page.panX || 0,
    panY: page.panY || 0,
    nodes: page.nodes || [],
    connectors: page.connectors || [],
    streams: page.streams || []
  }));

  return {
    version: state.version || 7,
    name: state.name || 'Untitled Scheme',
    activePageId: state.activePageId || pages[0]?.id || 'page_1',
    pages,
    flowLegendsOn: state.flowLegendsOn || false,
    showSheetFrame: state.showSheetFrame !== false,
    gridVisible: state.gridVisible !== false,
    snapToGrid: state.snapToGrid !== false,
    exportedAt: new Date().toISOString()
  };
}

export function exportSinglePage(state, pageId) {
  const page = state.pages.find(p => p.id === pageId) || state.pages[0];
  if (!page) return null;

  return {
    version: state.version || 7,
    name: state.name || 'Untitled Scheme',
    activePageId: page.id,
    pages: [{
      id: page.id,
      name: page.name,
      layout: page.layout || 'A4',
      orientation: page.orientation || 'landscape',
      zoom: page.zoom || 1,
      panX: page.panX || 0,
      panY: page.panY || 0,
      nodes: page.nodes || [],
      connectors: page.connectors || [],
      streams: page.streams || []
    }],
    exportedAt: new Date().toISOString()
  };
}

export function exportStreamReport(state) {
  return state.connectors.map(c => ({
    id: c.id,
    name: c.name,
    source: c.fromNodeId || c.source?.station_id,
    target: c.toNodeId || c.target?.station_id,
    mediumType: c.mediumType || 'Syrup',
    flow: c.properties?.flow || '',
    temperature: c.properties?.temperature || '',
    pressure: c.properties?.pressureAbs || '',
    role: connectorRole(c),
    solveStatus: c.solveStatus || 'UNSOLVED'
  }));
}

export function exportStationReport(state) {
  return state.nodes.map(n => ({
    id: n.id,
    equipmentTag: n.equipmentTag || '—',
    label: n.label || n.type || '—',
    type: n.type,
    stationNumber: n.stationNumber || '—',
    solveStatus: n.solveStatus || 'UNSOLVED',
    params: n.params || {}
  }));
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

export { exportStreamReport, exportStationReport };