/**
 * core/state.js — Sugar Engineering Process Design
 * State management, page model, schema versioning, migrations.
 *
 * This module owns the application state object and all state-mutating helpers.
 * It does NOT touch the DOM. All rendering is triggered by the caller.
 */

(function() {
  const SE = window.SugarEngineering = window.SugarEngineering || {};
  const State = SE.State = SE.State || {};

  State.WORLD_W = 2200;
  State.WORLD_H = 1400;

  State.createDefaultState = function() {
    return {
      version: 5,
      schemaVersion: 1,
      name: 'New Massecuite Scheme',
      activePageId: 'page_1',
      pages: [{
        id: 'page_1', name: 'Page 1', order: 0, layout: 'A4', orientation: 'landscape',
        zoom: 1, panX: 0, panY: 0, nodes: [], connectors: [], streams: []
      }],
      nodes: [], connectors: [], streams: [],
      flowLegendsOn: false, showSheetFrame: true, gridVisible: true, snapToGrid: true
    };
  };

  State.ensurePageModel = function(s) {
    if (!s) return;
    if (!s.pages || !Array.isArray(s.pages) || s.pages.length === 0) {
      s.pages = [{
        id: 'page_1', name: 'Page 1', order: 0, layout: 'A4', orientation: 'landscape',
        zoom: 1, panX: 0, panY: 0, nodes: s.nodes || [], connectors: s.connectors || [],
        streams: s.streams || s.connectors || []
      }];
      s.activePageId = 'page_1';
    }
    if (!s.activePageId || !s.pages.some(p => p.id === s.activePageId)) {
      s.activePageId = s.pages[0].id;
    }
  };

  State.activePage = function(state) {
    State.ensurePageModel(state);
    return state.pages.find(p => p.id === state.activePageId) || state.pages[0];
  };

  State.saveActivePageData = function(state, zoom) {
    if (!state.pages) return;
    const cur = state.pages.find(p => p.id === state.activePageId);
    if (cur) { cur.nodes = state.nodes; cur.connectors = state.connectors; cur.zoom = zoom; }
  };

  State.createPage = function(state, name, options) {
    options = options || {};
    const count = state.pages.length + 1;
    const newId = 'page_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newPage = {
      id: newId, name: name || ('Page ' + count), order: state.pages.length,
      layout: options.layout || 'A4', orientation: options.orientation || 'landscape',
      zoom: 1, panX: 0, panY: 0, nodes: [], connectors: [], streams: []
    };
    state.pages.push(newPage);
    return newPage;
  };

  State.duplicatePage = function(state, pageId, cloneFn) {
    const srcPage = state.pages.find(p => p.id === pageId) || State.activePage(state);
    if (!srcPage) return null;
    const newId = 'page_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const idMap = new Map();
    const srcNodes = srcPage.id === state.activePageId ? state.nodes : srcPage.nodes;
    const srcConnectors = srcPage.id === state.activePageId ? state.connectors : srcPage.connectors;

    const clonedNodes = (srcNodes || []).map(n => {
      const c = cloneFn(n);
      const oldId = c.id;
      c.id = 'node_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      idMap.set(oldId, c.id);
      return c;
    });

    const clonedConnectors = (srcConnectors || []).map(c => {
      const conn = cloneFn(c);
      conn.id = 'stream_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      if (idMap.has(conn.fromNodeId)) conn.fromNodeId = idMap.get(conn.fromNodeId);
      if (idMap.has(conn.toNodeId)) conn.toNodeId = idMap.get(conn.toNodeId);
      if (conn.source && idMap.has(conn.source.station_id)) conn.source.station_id = idMap.get(conn.source.station_id);
      if (conn.target && idMap.has(conn.target.station_id)) conn.target.station_id = idMap.get(conn.target.station_id);
      return conn;
    });

    const newPage = {
      id: newId, name: 'Copy of ' + srcPage.name, order: state.pages.length,
      layout: srcPage.layout || 'A4', orientation: srcPage.orientation || 'landscape',
      zoom: srcPage.zoom || 1, panX: srcPage.panX || 0, panY: srcPage.panY || 0,
      nodes: clonedNodes, connectors: clonedConnectors, streams: []
    };
    state.pages.push(newPage);
    return newPage;
  };

  State.renamePage = function(state, pageId, newName) {
    if (!newName || !newName.trim()) return false;
    const pg = state.pages.find(p => p.id === pageId);
    if (!pg) return false;
    pg.name = newName.trim();
    return true;
  };

  State.deletePage = function(state, pageId) {
    if (state.pages.length <= 1) return { ok: false, reason: 'cannot_delete_only_page' };
    const idx = state.pages.findIndex(p => p.id === pageId);
    if (idx < 0) return { ok: false, reason: 'page_not_found' };
    state.pages.splice(idx, 1);
    state.pages.forEach((p, i) => { p.order = i; });
    if (state.activePageId === pageId) {
      const nextIdx = Math.min(idx, state.pages.length - 1);
      state.activePageId = state.pages[nextIdx].id;
    }
    return { ok: true, deletedId: pageId };
  };

  State.activatePage = function(state, pageId, zoomSetter) {
    State.saveActivePageData(state, zoomGetter());
    const target = state.pages.find(p => p.id === pageId) || state.pages[0];
    state.activePageId = target.id;
    state.nodes = target.nodes || [];
    state.connectors = target.connectors || [];
    target.nodes = state.nodes;
    target.connectors = state.connectors;
    if (target.zoom) zoomSetter(target.zoom);
    return target;
  };

  State.movePage = function(state, pageId, direction) {
    const idx = state.pages.findIndex(p => p.id === pageId);
    if (idx < 0) return false;
    if (direction === 'start') {
      const item = state.pages.splice(idx, 1)[0]; state.pages.unshift(item);
    } else if (direction === 'end') {
      const item = state.pages.splice(idx, 1)[0]; state.pages.push(item);
    } else if (direction === 'left' && idx > 0) {
      const temp = state.pages[idx]; state.pages[idx] = state.pages[idx - 1]; state.pages[idx - 1] = temp;
    } else if (direction === 'right' && idx < state.pages.length - 1) {
      const temp = state.pages[idx]; state.pages[idx] = state.pages[idx + 1]; state.pages[idx + 1] = temp;
    } else { return false; }
    state.pages.forEach((p, i) => { p.order = i; });
    return true;
  };

  State.setPageSetup = function(state, pageId, options) {
    const pg = state.pages.find(p => p.id === pageId);
    if (!pg) return false;
    if (options.layout) pg.layout = options.layout;
    if (options.orientation) pg.orientation = options.orientation;
    return true;
  };

  // --- Migrations -----------------------------------------------------------

  State.migrateV5ToV6 = function(obj) {
    const s = { ...obj };
    s.version = 6;
    s.schemaVersion = (obj.schemaVersion || 1) + 1;
    s.multiSelectEnabled = true; s.selectionMode = 'single'; s.smartGuidesOn = true;
    s.layerManagerEnabled = true; s.multiSelect = [];
    if (s.pages && Array.isArray(s.pages)) {
      s.pages = s.pages.map(page => {
        const migrated = { ...page };
        if (!migrated.layerDefinitions) {
          migrated.layerDefinitions = [{ id: 'layer_default', name: 'Default', visible: true, locked: false }];
          migrated.layerVisibility = { 'layer_default': true };
        }
        if (!migrated.groupDefinitions) migrated.groupDefinitions = [];
        return migrated;
      });
    }
    return s;
  };

  State.migrateV6ToV7 = function(obj) { const s = { ...obj }; s.version = 7; return s; };

  State.loadAndMigrate = function(obj) {
    const version = obj.version ?? 5;
    switch (version) {
      case 5: return State.migrateV5ToV6(obj);
      case 6: return State.migrateV6ToV7(obj);
      case 7: return obj;
      default: throw new Error('Unsupported project version: ' + version);
    }
  };

  // --- Utility --------------------------------------------------------------
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  State.clone = clone;
})();