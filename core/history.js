/**
 * core/history.js — Undo/redo history management.
 *
 * Operates on plain state objects via snapshot functions provided by the caller.
 * Does NOT touch the DOM.
 */

const DEFAULT_MAX_STACK = 80;

export function createHistory({ maxSize = DEFAULT_MAX_STACK, snapshotFn } = {}) {
  let undoStack = [];
  let redoStack = [];
  let suppressed = false;

  function push(state) {
    if (suppressed) return;
    if (!snapshotFn) return;
    undoStack.push(snapshotFn(state));
    if (undoStack.length > maxSize) undoStack.shift();
    redoStack = [];
  }

  function undo(state) {
    if (undoStack.length === 0) return null;
    redoStack.push(snapshotFn(state));
    const prev = undoStack.pop();
    return prev;
  }

  function redo(state) {
    if (redoStack.length === 0) return null;
    undoStack.push(snapshotFn(state));
    const next = redoStack.pop();
    return next;
  }

  function suppress(fn) {
    suppressed = true;
    try { return fn(); }
    finally { suppressed = false; }
  }

  function clear() {
    undoStack = [];
    redoStack = [];
  }

  function getUndoSize() { return undoStack.length; }
  function getRedoSize() { return redoStack.length; }

  return { push, undo, redo, suppress, clear, getUndoSize, getRedoSize };
}

export function snapshotStateJSON(state) {
  return JSON.stringify(canonicalStateObject(state));
}

export function canonicalStateObject(src) {
  const { version, schemaVersion, name, activePageId, pages, flowLegendsOn, showSheetFrame, gridVisible, snapToGrid } = src;
  return {
    version,
    schemaVersion,
    name,
    activePageId,
    pages: pages.map(p => ({
      ...p,
      nodes: [],
      connectors: [],
      streams: []
    })),
    nodes: src.nodes || [],
    connectors: src.connectors || [],
    streams: src.streams || [],
    flowLegendsOn,
    showSheetFrame,
    gridVisible,
    snapToGrid
  };
}