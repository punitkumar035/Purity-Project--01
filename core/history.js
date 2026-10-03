/**
 * core/history.js — Undo/redo history management.
 * Operates on plain state objects via snapshot functions provided by the caller.
 * Does NOT touch the DOM.
 */

(function() {
  const SE = window.SugarEngineering = window.SugarEngineering || {};
  const History = SE.History = SE.History || {};

  const DEFAULT_MAX_STACK = 80;

  History.createHistory = function(options) {
    options = options || {};
    const maxSize = options.maxSize || DEFAULT_MAX_STACK;
    const snapshotFn = options.snapshotFn;

    let undoStack = [];
    let redoStack = [];
    let suppressed = false;

    return {
      push: function(state) {
        if (suppressed) return;
        if (!snapshotFn) return;
        undoStack.push(snapshotFn(state));
        if (undoStack.length > maxSize) undoStack.shift();
        redoStack = [];
      },
      undo: function(state) {
        if (undoStack.length === 0) return null;
        redoStack.push(snapshotFn(state));
        return undoStack.pop();
      },
      redo: function(state) {
        if (redoStack.length === 0) return null;
        undoStack.push(snapshotFn(state));
        return redoStack.pop();
      },
      suppress: function(fn) {
        suppressed = true;
        try { return fn(); }
        finally { suppressed = false; }
      },
      clear: function() { undoStack = []; redoStack = []; },
      getUndoSize: function() { return undoStack.length; },
      getRedoSize: function() { return redoStack.length; }
    };
  };

  History.snapshotStateJSON = function(state) {
    return JSON.stringify(History.canonicalStateObject(state));
  };

  History.canonicalStateObject = function(src) {
    const { version, schemaVersion, name, activePageId, pages, flowLegendsOn, showSheetFrame, gridVisible, snapToGrid } = src;
    return {
      version, schemaVersion, name, activePageId,
      pages: pages.map(function(p) { return { ...p, nodes: [], connectors: [], streams: [] }; }),
      nodes: src.nodes || [], connectors: src.connectors || [], streams: src.streams || [],
      flowLegendsOn, showSheetFrame, gridVisible, snapToGrid
    };
  };
})();