/**
 * core/persistence.js — Project save/load, File System Access, recovery.
 *
 * Pure persistence functions operating on plain state objects.
 * Does NOT touch the DOM.
 */

const RECOVERY_KEY = 'massecuite_project_recovery_v5';
const RECOVERY_META_KEY = 'massecuite_project_recovery_v5_meta';
const TEMPLATE_INDEX_KEY = 'massecuite_template_index';

export function getRecoveryKey() { return RECOVERY_KEY; }
export function getRecoveryMetaKey() { return RECOVERY_META_KEY; }
export function getTemplateIndexKey() { return TEMPLATE_INDEX_KEY; }

export function saveRecoverySnapshot(jsonText) {
  try {
    localStorage.setItem(RECOVERY_KEY, jsonText);
    localStorage.setItem(RECOVERY_META_KEY, JSON.stringify({
      timestamp: Date.now(),
      size: jsonText.length
    }));
    return true;
  } catch (e) {
    console.warn('Browser recovery snapshot could not be written:', e);
    return false;
  }
}

export function getRecoverySnapshot() {
  try {
    const txt = localStorage.getItem(RECOVERY_KEY);
    const meta = localStorage.getItem(RECOVERY_META_KEY);
    if (!txt) return null;
    return { text: txt, meta: meta ? JSON.parse(meta) : null };
  } catch {
    return null;
  }
}

export function clearRecoverySnapshot() {
  try {
    localStorage.removeItem(RECOVERY_KEY);
    localStorage.removeItem(RECOVERY_META_KEY);
  } catch { /* ignore */ }
}

export function saveTemplate(state) {
  try {
    const json = JSON.stringify(canonicalStateObject(state));
    const key = 'massecuite_template_' + Date.now();
    const list = JSON.parse(localStorage.getItem(TEMPLATE_INDEX_KEY) || '[]');
    list.push({ key, name: state.name || 'Template', timestamp: Date.now() });
    localStorage.setItem(TEMPLATE_INDEX_KEY, JSON.stringify(list));
    localStorage.setItem(key, json);
    return true;
  } catch (e) {
    console.warn('Template save failed:', e);
    return false;
  }
}

export function listTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_INDEX_KEY) || '[]');
  } catch {
    return [];
  }
}

export function loadTemplate(key) {
  try {
    const txt = localStorage.getItem(key);
    if (!txt) return null;
    return JSON.parse(txt);
  } catch {
    return null;
  }
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

// --- File System Access ---------------------------------------------------

export async function downloadJSON(jsonText, filename = 'scheme.json') {
  const blob = new Blob([jsonText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openFilePicker(accept = '.json,application/json') {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Sugar Scheme Files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      const file = await handle.getFile();
      return { handle, file };
    } catch {
      // Fall through to fallback
    }
  }
  return null;
}

export async function readFileText(file) {
  return await file.text();
}

export async function saveFilePicker(jsonText, filename = 'scheme.json') {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Sugar Scheme Files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(jsonText);
      await writable.close();
      return { handle, cancelled: false };
    } catch (e) {
      if (e.name === 'AbortError') return { cancelled: true };
      // Fallback to download
      await downloadJSON(jsonText, filename);
      return { cancelled: false, fallback: true };
    }
  }
  await downloadJSON(jsonText, filename);
  return { cancelled: false, fallback: true };
}