// UI Phase-9: network solve-state box — square, high-contrast, state-driven.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'main.css'), 'utf8');
const glass = fs.readFileSync(path.join(ROOT, 'css', 'theme-glass.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let fail = 0;
const ok = (c, msg) => { if (!c) { console.log('FAIL:', msg); fail++; } else console.log('ok:', msg); };
// square box, explicit colors (never inherited ink-on-navy)
ok(/\.status-pill\{[^}]*border-radius:0/.test(css), 'box has square corners');
ok(/\.status-pill\.ok\{color:#4ade80\}/.test(css), 'solved text/icon green');
ok(/\.status-pill\.warn,.status-pill\.err\{color:#f87171\}/.test(css), 'unsolved text/icon red');
ok(/\.status-pill #statusIcon\{[^}]*stroke:currentColor/.test(css), 'icon inherits state color');
// markup: svg slot, no dot
ok(html.includes('id="statusIcon"'), 'index has svg icon slot');
ok(!html.includes('status-dot'), 'no legacy dot in markup');
// renderer: binary labels from cls, detail to tooltip, click to audit
ok(js.includes("label=(cls==='info')?text:(solved?'network solved':'network unsolved')"), 'labels derive from state class');
ok(js.includes('statusEl.title=text||label'), 'detail preserved in tooltip');
ok(js.includes("pill.onclick=()=>document.getElementById('auditBtn')"), 'click opens Solver Audit');
ok(js.includes('M8.5 12.5l2.5 2.5 4.5-5.5') && js.includes('M9 9l6 6M15 9l-6 6'), 'check and cross icons present');
// glass theme: scoped state colors beat the old ink rule; theme loads last
ok(html.includes('css/theme-glass.css'), 'glass theme stylesheet linked last');
ok(/\.status-strip \.status-pill\.ok\{color:/.test(glass), 'glass solved color scoped to win');
ok(/\.status-strip \.status-pill\.err\{color:|\.status-strip \.status-pill\.warn,.status-strip \.status-pill\.err\{color:/.test(glass), 'glass unsolved color scoped to win');
ok(/\.ribbon-status\{display:none\}/.test(glass), 'emptied status strip hidden');
// relocation: pill + engine badge dock into the Figma status strip
ok(js.includes("strip.append(pill)") && js.includes("statusStripRight"), 'pills dock into status strip');
ok(js.includes("function dockNetStatus()"), 'self-healing dock function exists');
ok(js.includes("dockNetStatus();") && js.includes("DOMContentLoaded"), 'dock re-asserted on boot and DOM ready');
ok(js.includes("PILL DOCK FAILED. pillParent:") && js.includes("strips:"), 'dock failure reports parent and strip count');
ok(/\.status-strip \.status-pill\{/.test(glass), 'pill carries frosted box in strip');
ok(!/\.ribbon-status \.status-pill\{color:#18344c/.test(glass), 'no ink-override carried into glass theme');
ok(glass.includes('backdrop-filter'), 'frosted surfaces present');
ok(glass.includes('assets/purity-logo') || html.includes('assets/purity-logo.png'), 'logo asset referenced');
// phase-2 glass surfaces (selectors present in theme layer)
for (const sel of ['.palette-item::after', '.group-title::before', '.page-tab.active',
  '.ribbon-command svg', '.flow-legend', '::-webkit-scrollbar-thumb', '.viewport{',
  'grid-template-columns:250px']) ok(glass.includes(sel), 'glass covers ' + sel);
const exits = (js.match(/setStatus\('/g) || []).length;
ok(exits >= 10, 'solver exits route via setStatus (' + exits + ' call sites)');
// network state tile (display-only globe next to Solver Audit)
ok(js.includes("command('Network: Uninitialized',null,'globe'"), 'network tile defined display-only after audit');
ok(js.includes("globe:'M2 12a10 10 0 1 0 20 0"), 'globe icon in map');
ok(js.includes("networkAttempted=false") && js.includes("network-tile"), 'tile state sync in setStatus');
ok(/\.ribbon-command\.network-init svg\{stroke:#b45309/.test(glass), 'uninitialized orange present');
// flow-legends state is icon-only (tile never goes green)
ok(js.includes("classList.toggle('legends-on'"), 'legends toggle uses icon-only class');
ok(/\.ribbon-command\.legends-on svg\{stroke:#0e7d93/.test(glass), 'legends-on recolors icon only');
// phase-A multi-select: set model, marquee, modifiers, batch delete
ok(js.includes("let selectedSet = []"), 'selection set model exists');
ok(js.includes("marquee-rect") && glass.includes('.marquee-rect{'), 'marquee rubber band styled');
ok(js.includes("toLowerCase()==='a'") && js.includes("e.key==='Escape'"), 'Ctrl+A and Escape wired');
ok(js.includes("function deleteSelected(pairMode)") || js.includes("function deleteSelected("), 'batch delete entry exists');
// ctrl+wheel zoom-at-cursor (Phase A+)
ok(js.includes("addEventListener('wheel'") && js.includes("function zoomAt(factor,clientX,clientY)"), 'wheel zoom listener + anchor fn exist');
ok(js.includes("viewport.scrollLeft+=wx*(zoom-z0)"), 'zoom anchor math present');
ok(js.includes("Math.max(.45,Math.min(3,z))"), 'zoom bounds 45-300%');
// auto-grow world (Visio pasteboard): per-page dims, growth helper, clamp shorthands
ok(js.includes("function ensureWorldFits(") && js.includes("WORLD_GROW_MAX_W"), 'world growth helper with cap exists');
ok(js.includes("function WW(){return pageWorld().w;}"), 'clamp shorthands read active page');
// model clipboard: copy/cut/paste the selection set (link halves keep legacy path)
ok(js.includes("let modelClipboard=null"), 'model clipboard store exists');
ok(js.includes("function copySelectionSet(") && js.includes("function pasteSelectionSet("), 'set copy/paste exist');
ok(js.includes("station_id:idMap[ep.station_id]"), 'internal endpoints remap on paste');
// ctrl+drag live clone (Visio copy): deferred toggle + threshold instantiate
ok(js.includes("pendingToggle") && js.includes("instantiateClones(cb,cb.minX,cb.minY)"), 'clone-drag defers toggle and clones in place');
ok(js.includes("function instantiateClones(cb,tx,ty)"), 'shared instantiate routine exists');
// drag-loop hardening: per-frame wire faults surface instead of freezing
ok(js.includes("function safeRenderWires()"), 'guarded wire renderer exists');
ok(js.includes("[wires] refresh failed"), 'wire faults named in console');
// home button (standard tile; dark theme retired 2026-10-04) + layout diagnostic gate
ok(js.includes("command('Home'") && js.includes("'home'") && !js.includes('home-dark'), 'Home command wired as standard tile (no dark class)');
ok(!/\.ribbon-command\.home-dark\{/.test(glass), 'dark-button theme retired');
ok(js.includes("qp.get('debug')==='layout'"), 'layout diagnostic overlay gated behind ?debug=layout');
// dock verification: placement checked at runtime, failure self-reports
ok(js.includes("pill.parentElement===strip"), 'dock placement is verified at runtime');
ok(js.includes("PILL DOCK FAILED"), 'dock failure self-reports instead of failing silent');
console.log(fail === 0 ? 'ALL UI PHASE9 TESTS PASS' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
