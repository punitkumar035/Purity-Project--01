# MaxGraph Editor Migration Plan

**Status:** Proposal only. No runtime implementation is included in this document change.

## 1. Goal and Guardrails

Upgrade the Sugar application’s diagram editing experience toward Visio/draw.io quality while keeping the current Sugar model and calculation behavior authoritative.

**Keep unchanged as the source of truth:** project JSON, page-local node/connector collections, `nodeDefs`, equipment/stream properties, endpoint and port IDs, `connectorRole()` semantics, validation, solver, calculation results, diagnostics, and existing engineering property windows.

**Use maxGraph for:** canvas rendering, selection and editing interactions, viewport controls, visual routing/handles, and editor events. It must be replaceable without migrating or rewriting engineering equations.

**Do not do in this migration:** convert project files to draw.io/maxGraph XML; replace the Sugar solver with graph algorithms; introduce cross-page process links; turn visual groups into process stations; or extract the entire IIFE into the attachment’s proposed directory tree.

## 2. Integration Shape

```text
Existing ribbon / palette / properties
                 │ existing commands
                 ▼
       Thin Sugar ↔ maxGraph adapter
                 │
                 ├── maxGraph view model (temporary projection)
                 │
                 ▼
 Current project state: nodes + connectors + pages
                 │
                 ▼
       Existing validation and solver
```

Each graph vertex/edge should carry a reference to an existing domain ID. Rebuilding the canvas from a saved project must not create or rename domain objects. Graph events should call a small Sugar bridge for add/move/connect/disconnect/route operations; they should not write arbitrary cell data into solver inputs.

Use `BaseGraph` with only the required interaction plugins. Avoid maxGraph’s complete `Editor` shell, built-in properties UI, and independent undo history because the application already owns ribbon, dialogs, save/load, and history. Build station shapes from the current equipment catalog and preserve the current connector endpoint representation, including free points.

## 3. Packaging Decision

The current application is a classic-script page with no package manifest. maxGraph’s official README says package use is intended with a bundler and direct plain-page usage is unsupported. Add only the smallest build wrapper needed to install and bundle `@maxgraph/core` (for example, Vite); keep `main.js` and its Sugar calculations as legacy application code during the canvas migration. This is frontend packaging work, not a solver/data-model rewrite.

Pin the tested maxGraph version, keep its Apache-2.0 license/attribution, and verify its distribution/build output before using it in a deployed copy. Do not install dependencies or change runtime files until the user approves implementation.

## 4. Phases

### M0 — Baseline and contract freeze

- Run the existing app and record representative project files and solver results.
- Preserve the current version-5 JSON fixtures and current palette inventory.
- Add/confirm regression coverage for ports, free/external/internal Universal Flow, endpoint normalization, routing persistence, undo/redo, and solver outputs.
- Record the current UI and rendering contract in `ARCHITECTURE_AUDIT.md` and feature decisions in `DRAWIO_ADOPTION_MATRIX.md`.

**Gate:** all baseline fixtures reopen and retain identity, routes, properties, and solver behavior.

### M1 — Dependency and renderer spike

- Create an isolated maxGraph canvas entry behind a renderer feature flag.
- Add a bundled `BaseGraph` instance with selection, connection, panning/fit, and cell-rendering essentials only.
- Render a small read-only projection: one Pan, one Evaporator, their semantic ports, an internal connector, and a free Universal Flow connector.
- Compare geometry, visible identity/status, page clipping, zoom, and connector endpoints with the current canvas.

**Gate:** no edits reach project state in this phase; current canvas remains the fallback; bundled app starts without runtime errors.

### M2 — Read-only Sugar canvas projection

- Map each node ID to one graph vertex and each connector ID to one graph edge.
- Render station name, tag/station number, solver state, and ports from current node/port definitions.
- Render source/target port anchors using the current `port_id` and endpoint side; render point endpoints as genuinely dangling ends.
- Render current page only. Rebuild the projection after project open, page switch, undo/redo, and solve; never serialize the graph model as the project.

**Gate:** read-only render does not mutate JSON or alter a solve result.

### M3 — Interaction and adapter

- Route palette insert actions through current station/flow creation commands.
- Add move, selection, multi-selection, marquee, and keyboard interaction incrementally.
- Validate a proposed connection through the existing direction, occupancy, and medium-compatibility rules before committing it.
- Commit a topology edit only when an endpoint is released on a valid port; preserve neutral/free endpoints and external input/output roles.
- Translate route-handle edits to the existing route mode/points/legacy fields. Keep route reset and endpoint reconnect behavior.

**Gate:** invalid connections are rejected with the existing Sugar reason; graph events preserve station and connector IDs; no graph operation bypasses the adapter.

### M4 — Separate visual edits from engineering invalidation

- Add explicit change classes: presentation geometry/style, topology, and engineering property.
- Route bends, line styling, node movement, viewport changes, and visual grouping must not clear solver state unless domain semantics changed.
- Endpoint attach/detach, port changes, equipment type changes, and engineering property changes must invalidate the appropriate solver state and diagnostics.
- Make a complete drag/resize/route gesture one Sugar undo transaction. Keep one history owner; do not combine Sugar snapshots with a maxGraph undo manager.

**Gate:** route-only edits preserve solved statuses and engineering values; topology/property edits invalidate and subsequently recompute as expected; undo/redo restores both view and domain state.

### M5 — Visio-style UI integration

- Keep the current palette content and add search/category collapse, reusable drag previews, and polished selection states.
- Restyle/extend the existing ribbon: File, Home, Insert, Design, View, Engineering, and Solver groups. Bind ribbon, context menu, keyboard, and palette actions to shared application commands where feasible.
- Keep current station and stream engineering property panels. Add visual shape formatting as a distinct presentation-only section; do not substitute generic diagram properties for engineering forms.
- Add missing editor features in priority order: marquee/multi-select, grid and smart guides, align/distribute, keyboard move, fit-to-selection, page rulers/minimap, then optional groups/layers.

**Gate:** every ribbon command has a real handler or is clearly disabled; property editing preserves current behavior; visual formatting cannot overwrite Sugar parameters.

### M6 — Persistence, parity, and rollout

- Continue loading/saving version-5 Sugar JSON. Add only optional presentation fields with a migration if a new visual attribute must persist.
- Preserve route fields and legacy connector compatibility. Build the graph projection from JSON on load; do not persist duplicate graph cells.
- Test duplicate page, page activation, project recovery, save/open, report/export, solver audit, and all existing property workflows.
- Run old and maxGraph renderers side-by-side on test fixtures, then enable the new renderer by default only after parity passes. Retain the old renderer as rollback until release acceptance.

**Gate:** old project opens and round-trips without data loss; engineering outputs match baseline; rollback switch works.

## 5. Important Scope Decision: Pages

The current implementation stores nodes and connectors per page and solves the active page independently; cross-page stream references are explicitly unavailable. This migration will preserve that behavior. The attachment’s desired project-wide engineering network and non-duplicated equipment across pages require a separate domain-model design, schema migration, and solver/topology decision. Do not imply that maxGraph can provide this as a visual-only feature.

## 6. Test and Acceptance Checklist

- All 29 visible palette entries render; source/legacy definitions still load from old files.
- Node/connector IDs, station numbers, tags, port IDs, properties, and existing routes survive render, save, reload, page switch, duplicate, undo, and redo.
- Test output→input, input/output acceptance, occupied ports, free connector endpoints, external input/output, and the one-stream-per-output rule.
- Manual bend/segment/endpoint handles preserve orthogonality and do not change engineering topology unless an endpoint is reattached.
- Run representative Pan, Evaporator, Injection Heater, Crystallizer, Centrifugal, Mixer, Splitter, and stream-property fixtures before/after; compare statuses, stream states, and balances.
- Verify visual-only edit does not invalidate solve results; verify topology/property changes do.
- Exercise 100+ node/connector canvases and multi-page projects; measure drag responsiveness and ensure no full-project rebuild on each pointer movement.
- Verify console/runtime errors, keyboard accessibility, zoom/pan, print, and existing exports.

## 7. Risks and Controls

| Risk | Control |
|---|---|
| Two competing graph/project models | Treat maxGraph cells strictly as a projection; domain IDs and current JSON remain canonical. |
| Connector direction or boundary semantics change | Use existing Sugar validation and commit endpoint changes only through the adapter. Test dangling and external connectors explicitly. |
| Visual change invalidates solver or edits do not invalidate it | Split view-change notifications from topology/property invalidation before enabling editable graph events. |
| Two undo stacks diverge | Retain Sugar history as the sole authority; batch one history snapshot per completed gesture. |
| Build integration expands into a rewrite | Bundle only the new adapter/dependency; do not convert the solver or all application files to modules in this phase. |
| maxGraph API or behavior differs from current connector UX | Pin version, prototype early, retain the current renderer behind a fallback. |
| Cross-page process links are assumed to work | Keep page-local solver scope; handle shared engineering networks as a separately approved project. |

## 8. Upstream References

- [maxGraph repository and setup](https://github.com/maxGraph/maxGraph)
- [maxGraph selected-features example](https://github.com/maxGraph/maxGraph/tree/main/packages/ts-example-selected-features)
- [maxGraph toolbar example](https://github.com/maxGraph/maxGraph/blob/main/packages/html/stories/Toolbar.stories.ts)
- [maxGraph stencil example](https://github.com/maxGraph/maxGraph/blob/main/packages/html/stories/Stencils.stories.ts)
- [draw.io repository](https://github.com/jgraph/drawio)
- [Existing Sugar ribbon/multipage plan](Sugar_Ribbon_Multi_Page_Workspace_Implementation_Plan.md)
- [Code-based architecture audit](ARCHITECTURE_AUDIT.md)
- [Capability adoption matrix](DRAWIO_ADOPTION_MATRIX.md)