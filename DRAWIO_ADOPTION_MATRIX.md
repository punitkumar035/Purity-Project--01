# Draw.io Adoption Matrix

This matrix maps the existing Sugar Engineering application's capabilities against draw.io reference repositories, documenting current state and recommended actions.

## Reference Sources

- **draw.io** (jgraph/drawio): Mature diagram editor with complete feature set
- **draw.io-libs** (jgraph/drawio-libs): Pre-built libraries and stencils
- **drawio-desktop** (jgraph/drawio-desktop): Desktop client with full feature set

## Capability Comparison Table

| Capability | Existing Sugar App | Draw.io Reference | Action / Decision |
|------------|-------------------|-------------------|-------------------|
| **Nodes** | ✅ 34+ domain-specific equipment types (Pan, Crystallizer, Centrifugal2/3, Magma, Melter, Evaporator, Heater, etc.)<br>Each with fixed port count, type-specific parameters, engineering semantics | ✅ Mature node system with configurable shapes, icons, labels, and custom properties | ✅ **Improve/Adapt** — Domain-specific equipment already present; enhance visual representation and add grouping/layer support |
| **Ports** | ✅ Explicit port model with `inputs[]`/`outputs[]` definitions<br>Each port has: ID, name, accept category, side (left/right/top/bottom), engineered compatibility rules<br>Port compatibility logic (`portCompatibilityForEndpoint`, `glueConnectorEndpointToPort`) | ✅ Comprehensive port system with connection rules, compatibility, and smart snapping | ✅ **Improve** — Port model is robust; extend with drag-and-drop from palette, visual snap candidates, and multi-port groups |
| **Connectors** | ✅ Process stream model with topological semantics<br>Each has: source/target endpoints, quantity/pressure modes, streamClass, mediumType, solubility, components, props, solveStatus, solverMessage | ✅ Edge/connection system with orthogonal/bezier routing, handles, segment manipulation | ✅ **Improve** — Orthogonal routing already implemented with bend/segment handles; add manual routing override and stable route preservation |
| **Orthogonal Routing** | ✅ `routeOrthogonalBase`, `computedConnectorVertices`, `wirePath`, bend/segment drag<br>Auto-reset (`resetConnectorAutoRoute`), snap to endpoints, manual vertex manipulation | ✅ Advanced orthogonal routing with obstacle avoidance and stable routes | ✅ **Upgrade** — Sugar routing is functional; enhance with obstacle avoidance, route stability guarantee (connectors may move visually without topology change), and manual bend manipulation |
| **Selection** | ❌ Single only (`selected = {kind, id}`)<br>Contextual ribbon commands on object select | ✅ Multi-selection, Ctrl/Cmd+Click, Shift+Click, marquee box selection | ⬆ **Upgrade** — **Must implement**: Multi-selection (Ctrl+click, Shift+click, marquee), escape/deselect, select-all |
| **Snapping** | ✅ Port snapping with visual feedback (snap-candidate/incompatible CSS classes)<br>Grid snapping flag (`snapToGrid: true`) in state, CSS grid present | ✅ Grid snap, port snap, edge snap, center snap, smart guides | ⬆ **Upgrade** — Port snapping already present; add grid snapping with visual toggle, smart guides (center/edge alignment), and temporary guides |
| **Smart Guides** | ❌ Not implemented | ✅ Center alignment, edge alignment, equal spacing, temporary guides, snap tolerance | ⬆ **Implement** — **Must implement**: When moving equipment, display center/edge alignment guides, equal spacing, and snap tolerance |
| **Pages** | ✅ Full multi-page system (PageManager)<br>Create/duplicate/rename/delete pages, keyboard shortcuts (Ctrl+Alt+N, PageUp/PageDown), page setup (A4/A3/Letter, landscape/portrait)<br>Sheet frame & title block toggle, status pill ("Page 1 of N") | ✅ Visual page tabs, multi-page document support, navigation | ✅ **Preserve** — Full system already implemented; enhance with cross-page engineering references and better cross-page connectivity warnings |
| **Layers** | ❌ Not implemented | ✅ Layer visibility control, separate layer groups (Process Equipment, Process Streams, Steam, Condensate, Utilities, Instrumentation, Annotations, Dimensions, Engineering Notes) | ⬆ **Implement** — **Must implement**: Layer system where hidden layers still preserve engineering data visually; layer visibility toggles; data integrity across layer visibility changes |
| **Groups** | ❌ Not implemented | ✅ Group/ungroup, group movement, group selection, group resize<br>Example: Clarification Station group (Heater + Flash Tank + Clarifier + Mud Filter) | ⬆ **Implement** — **Must implement**: Primary diagram organization mechanism, separate from engineering stations but support station mapping if needed |
| **Undo/Redo** | ✅ Full undo/redo stack (80 entries max)<br>`pushHistory()` / `snapshotStateJSON()`, Ctrl+Z / Ctrl+Y, suppress history flag | ✅ Transaction-based history, per-action undo steps | ✅ **Preserve + Improve** — System already robust; enhance to prevent hundreds of entries during drag (one action = one undo step) |
| **Persistence** | ✅ JSON export/load, File System Access API, localStorage recovery<br>Templates in localStorage (`massecuite_template_index`), recovery version (`v5`) | ✅ Full project persistence, versioning, import/export, templates | ✅ **Preserve + Version** — Maintain backward compatibility; add schema migration system (`migrateV5ToV6()`, etc.) |
| **Solver** | ✅ Complete phase-1/2/3 solver with station-specific routines<br>`runPhase23Solver()`, required-flow paths, pressure-feedback paths, stream/node status | ✅ Generic graph engine only (no engineering semantics) | ⛔ **KEEP SUGAR** — Do not replace with generic graph engine. Maintain Sugar-specific solver with mass/energy balance calculations |
| **Engineering Calculations** | ✅ Complete property package: Cp (Hugot/Hugot_simple/user), BPE (Saska ASI 2002/Eq.8/Bubnik-Kadlec), solubility (Vavrinecz/ICUMSACoefficients a/b/c), density (Lyle 1957/Rein Eq. 32.8), water/steam (IAPWS-IF97), entrainment, UA, colour, pansolubility | ❌ Not applicable (generic diagram app) | ⛔ **KEEP SUGAR** — Do not replace engineering calculations to simplify architecture |
| **Equipment Model** | ✅ 34+ domain-specific equipment types with tags, station numbers, ports, parameters<br>Each equipment object retains: identity, type, tag, station number, engineering properties, ports, process relationships, solver relationships | ❌ Generic shapes only | ⛔ **KEEP SUGAR** — Do not convert Sugar equipment into generic shapes |
| **Process Streams** | ✅ Connector-based topology with boundary detection (source/sink)<br>Universal Flow stencil for free placement, topology rules (one stream per output port, use splitter for branching)<br>Stream properties: flow, temperature, pressure, composition, DS, purity, Brix, colour | ❌ Generic edges only | ⛔ **KEEP SUGAR** — Maintain Sugar-specific stream semantics (role, medium, quantity/pressure modes, composition) |
| **Engineering Validation** | ✅ Solver audit (steps, required/pressure paths, stream/node status)<br>Issue modal with exact panel/property/correction<br>Connection validation, topology issues, self-tests (phase 483/4833/Saska BPE) | ❌ Not equivalent (different semantics) | ⛔ **KEEP SUGAR** — Maintain Sugar-specific validation and audit |

## Key Insights

### What Sugar Already Solves Better Than draw.io

1. **Engineering Semantics** — Every connector represents a real process stream with medium, role, quantity mode, pressure mode, composition data. draw.io edges have no such semantics.

2. **Solver Integration** — The solver walks the network topology, computes mass/energy balances, and returns station/node status. draw.io has no solver.

3. **Equipment Domain Knowledge** — 34+ Sugar-specific equipment types with type-specific parameter validation (Pan BPE/convergence, Crystallizer supersaturation, Evaporator HTC/area, etc.).

4. **Calculation Preservation** — Engineering properties (DS, purity, Brix, temperature, pressure, solubility coefficients) are authoritative data, not just display.

5. **Project History & Recovery** — Full versioned JSON persistence with browser recovery and template library.

### What draw.io Solves Better Than Current Sugar App

1. **Professional Diagram Editor Features**
   - Multi-selection (single-select only currently)
   - Marquee selection (absent)
   - Group/ungroup functionality (absent)
   - Layer management (absent — only wire + node DOM layers)
   - Minimap (absent)
   - Coordinate rulers (absent)
   - Smart guides (absent — no alignment/edge guides)
   - Alignment/distribution tools (absent)
   - Bring/send backward/forward (absent)

2. **Visual Polish**
   - More sophisticated UI animations/interactions
   - Advanced SVG rendering (opacity, stroke gradients, etc.)
   - Better text handling and labeling

3. **Template/Stencil Libraries**
   - Pre-built shape libraries (though Sugar's engineering palette is more domain-specific)

### Hybrid Recommendation

The optimal path is **NOT** to replace the Sugar Engineering model with draw.io's generic diagram model, but rather:

1. **Implement missing professional diagramming features** as UI layer on top of the existing engineering model
2. **Adapt draw.io architectural patterns** (model-view separation, command pattern for history, event-driven interaction) without copying code
3. **Preserve all engineering semantics** — the sugar-specific model is the authoritative source

### Action Items from This Matrix

| Priority | Capability | What to Do |
|----------|------------|------------|
| **P0** | Multi-selection | Implement Ctrl+click, Shift+click, marquee box selection |
| **P1** | Smart Guides | Center/edge alignment guides when moving equipment |
| **P1** | Layers | Layer visibility system with data integrity guarantee |
| **P1** | Groups | Group/ungroup for diagram organization |
| **P2** | Rulers | Coordinate rulers (x, y position display) |
| **P2** | Minimap | Overview map of entire canvas |
| **P2** | Alignment/Distribution | Align left/right/center, distribute horizontally/vertically |
| **P3** | Solver Hardening | Isolate solver from DOM, ensure it operates on engineering model |
| **P3** | Migration System | Schema versioning (`migrateV5ToV6()`, etc.) |
| **P4** | SVG/PNG Export | Eventual export capability beyond JSON/Excel/PDF |

## Dependency-Aware Implementation Order

```
Phase 1 (Modularization):        Extract core/state.js, diagram/connectors.js, diagram/routing.js
Phase 2 (Professional Diagram):  Multi-selection + marquee, viewport/snapping upgrade
Phase 3 (Engineering Model):     Engineering adapter layer, solver isolation, migration system
Phase 4 (Professional UI):       Layers, groups, rulers, minimap, export SVG/PNG
```

## Code References in Sugar App

Key functions already implementing draw.io-adjacent patterns:
- `snapshotStateJSON()` — line 1413 (undo/redo state capture)
- `canonicalStateObject()` — line 1359 (state normalization)
- `connectorRole()` — line 994 (stream role determination)
- `connectorTopologyIssues()` — line 1027 (topology validation)
- `portCompatibilityForEndpoint()` — line 2861 (port compatibility)
- `glueConnectorEndpointToPort()` — line 2286 (endpoint gluing)
- `routeOrthogonalBase()` — line 2587 (orthogonal routing)
- `runPhase23Solver()` — line 11273 (solver engine)
- `renderSolverAudit()` — line 11375 (audit display)
- `PageManager` — multi-page system (create/duplicate/navigate)