/**
 * ui/ribbon.js — Engineering ribbon management.
 *
 * Pure UI functions for ribbon tab activation, contextual group rendering,
 * and command execution. No state changes.
 */

const TABS = {
  File: {
    Project: [],
    Pages: [],
    Templates: [],
    Output: []
  },
  Home: {
    Project: [],
    Edit: [],
    Pages: [],
    Flowsheet: [],
    Calculate: []
  },
  Insert: {
    Stations: [],
    Streams: [],
    Pages: [],
    Annotations: []
  },
  Design: {
    'Page Setup': [],
    'Sheet Frame': [],
    'Grid & Snap': []
  },
  Data: {
    Exchange: [],
    Identity: [],
    Tables: [],
    Units: []
  },
  Process: {
    Calculation: [],
    Balances: [],
    Control: []
  },
  Review: {
    Diagnostics: [],
    Verification: []
  },
  View: {
    Canvas: [],
    Panels: [],
    Indicators: []
  },
  Developer: {
    Inspection: [],
    Registries: [],
    Tests: []
  },
  Help: {
    Support: []
  }
};

const ICONS = {
  file: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7',
  save: 'M4 3h14l3 3v15H3V3z M7 3v6h10V3 M7 21v-8h10v8',
  play: 'M7 3l14 9L7 21z',
  table: 'M3 4h18v16H3z M3 9h18 M9 4v16 M15 4v16',
  settings: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5 5l3 3 M16 16l3 3',
  route: 'M3 5h9v14h9 M18 16l3 3-3 3',
  station: 'M5 3h14v17H5z M2 8h3 M19 15h3 M8 7h8 M8 11h8',
  zoom: 'M17 10a7 7 0 1 1-14 0 7 7 0 1 14 0 M15 15l6 6 M6 10h8 M10 6v8',
  import: 'M12 2v13 M7 10l5 5 5-5 M3 16v5h18v-5',
  export: 'M12 16V3 M7 8l5-5 5 5 M3 16v5h18v-5',
  undo: 'M8 4L3 9l5 5 M3 9h10a7 7 0 0 1 7 7',
  redo: 'M16 4l5 5-5 5 M21 9H11a7 7 0 0 0-7 7',
  check: 'M3 12l6 6L21 4',
  warning: 'M12 3L2 21h20z M12 9v5 M12 17v1',
  numbers: 'M3 6h3 M3 12h3 M3 18h3 M10 6h11 M10 12h11 M10 18h11',
  legend: 'M3 11l8-8h5v5l-8 8z M14 6h.01 M5 19h5 M5 15.5h3'
};

export function installEngineeringRibbon(options = {}) {
  const { onActivateTab, onExecuteCommand } = options;

  // Preload ribbons with commands from the main app (will be overridden in launcher)
  // These are stub definitions; the actual ribbon commands are injected by main.js

  const nav = document.createElement('nav');
  nav.className = 'ribbon-tabs';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Engineering ribbon');

  const panel = document.createElement('div');
  panel.className = 'ribbon-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-label', 'Home');

  const status = document.createElement('div');
  status.className = 'ribbon-status';
  status.innerHTML = '<span>Phase 4.8.9</span><span>kg/h · °C · kPa abs</span><span id="backendStatusBadge" style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;cursor:pointer;background:#f1f5f9;color:#475569;">⚪ Checking Python Engine...</span>';

  const ribbonContainer = document.querySelector('.topbar');
  if (ribbonContainer) {
    ribbonContainer.appendChild(nav);
    ribbonContainer.appendChild(panel);
    ribbonContainer.appendChild(status);
  }

  // Populate tab buttons
  Object.keys(TABS).forEach(name => {
    const button = document.createElement('button');
    button.textContent = name;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    button.onclick = () => activateTab(name);
    nav.appendChild(button);
  });

  let currentTab = 'Home';

  function activateTab(name) {
    currentTab = name;
    nav.querySelectorAll('button').forEach((btn, index) => {
      const tabNames = Object.keys(TABS);
      btn.setAttribute('aria-selected', String(tabNames[index] === name));
      btn.tabIndex = tabNames[index] === name ? 0 : -1;
    });
    panel.setAttribute('aria-label', name);
    panel.replaceChildren();
    renderTabGroups(name);
    if (onActivateTab) onActivateTab(name);
  }

  function renderTabGroups(tabName) {
    const groups = TABS[tabName] || {};
    Object.entries(groups).forEach(([groupName, commands]) => {
      const group = document.createElement('div');
      group.className = 'ribbon-group';
      commands.forEach(cmd => {
        const button = document.createElement('button');
        button.className = 'ribbon-command';
        button.disabled = !cmd.action;
        button.title = cmd.reason || cmd.label;
        const iconPath = ICONS[cmd.icon] || ICONS.file;
        button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${iconPath}"/></svg><span>${cmd.label}</span>`;
        button.onclick = () => executeCommand(cmd);
        group.appendChild(button);
      });
      const label = document.createElement('div');
      label.className = 'ribbon-group-name';
      label.textContent = groupName;
      group.appendChild(label);
      panel.appendChild(group);
    });
  }

  function executeCommand(cmd) {
    if (cmd.action) {
      cmd.action();
      if (onExecuteCommand) onExecuteCommand(cmd);
    }
  }

  // Return public API
  return {
    activateTab,
    executeCommand,
    updateContextualGroup,
    isActiveTab: () => currentTab
  };
}

export function renderContextualGroup(panel, selected, actions) {
  // Clear previous contextual groups
  panel.querySelectorAll('.ribbon-group-contextual').forEach(el => el.remove());

  if (!selected) return;

  const group = document.createElement('div');
  group.className = 'ribbon-group ribbon-group-contextual';

  // Example styling based on object kind
  if (selected.kind === 'node') {
    group.style.background = '#f0fdf4';
    group.style.border = '1px solid #86efac';
  } else if (selected.kind === 'connector') {
    group.style.background = '#f0f9ff';
    group.style.border = '1px solid #7dd3fc';
  }

  actions.forEach(cmd => {
    const button = document.createElement('button');
    button.className = 'ribbon-command';
    button.disabled = !cmd.action;
    button.title = cmd.reason || cmd.label;
    button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${ICONS[cmd.icon] || ICONS.file}"/></svg><span>${cmd.label}</span>`;
    button.onclick = () => cmd.action();
    group.appendChild(button);
  });

  const label = document.createElement('div');
  label.className = 'ribbon-group-name';
  label.style.fontWeight = 'bold';
  label.style.color = selected.kind === 'node' ? '#15803d' : '#0369a1';
  label.textContent = `Selected: ${selected.id}`;
  group.appendChild(label);

  panel.prepend(group);
}

// Convenience command builder
export function command(label, action, icon = 'file', reason = '', category = 'Other') {
  return {
    label,
    action,
    icon,
    reason,
    category
  };
}

export function existing(label, id, icon = 'file', category = 'Other') {
  const action = () => {
    const el = document.getElementById(id);
    if (el) el.click();
  };
  return command(label, action, icon, `Execute ${label}`, category);
}

export function pending(label, reason) {
  return command(label, null, 'warning', reason, 'Pending');
}