# Architecture Audit

**Scope:** Existing Sugar Engineering web application, inspected 2026-09-28 for a diagram-editor upgrade plan. This is a code-based snapshot, not a proposal to rewrite the application.

## Summary

The application is a vanilla browser application whose runtime entry is `index.html` plus `js/main.js`. A single IIFE in `main.js` owns project state, page management, equipment/stream behavior, solver orchestration, dialogs, and much of the UI. Equipment nodes and Universal Flow connectors are structured project data; the HTML/SVG canvas is their current visual projection.

The safest editor upgrade is a renderer/interaction adapter around the current model and existing domain commands. The current JSON project format, equipment parameter definitions, stream properties, topology semantics, solver and audits must remain authoritative.

## Architecture Inventory

| # | Area | Verified current implementation |
|---|---|---|
| 1 | Entry point | `index.html` loads four CSS files and `js/main.js`; the JS is a classic script wrapped in an IIFE. There is no `package.json` or current bundler configuration. |
| 2 | Global state | The IIFE owns `state`, selection, zoom, drag state, page state, project file handle, and undo/redo stacks. `window.__APP_TEST_API__` exposes selected test hooks; `window.state` is also exposed near the end of the file. |
| 3 | State schema | Project version 5 / schema version 1. Root state includes name, pages, active page, settings, and active-page `nodes`/`connectors`; canonical serialization also stores page-specific nodes/connectors. `streams` is a compatibility getter over solver-active connectors. |
| 4 | Equipment model | `nodeDefs` defines station title, icon, input/output ports, and engineering defaults. Visible palette entries include 28 node stencils plus Universal Flow; source, sink, wash, clear-juice, and hot-water definitions also exist for boundary/legacy use. Equipment IDs, station numbers, type codes, tags, coordinates, and `params` are stored on nodes. |
| 5 | Port model | Ports have stable per-type IDs, names, input/output direction, optional medium acceptance category, and a fixed side. Port definitions are resolved from `nodeDefs`; connector endpoints reference station ID plus port ID. |
| 6 | Connector model | A connector has a stable ID, source and target endpoints, stream properties/components/solubility, quantity and pressure ownership modes, role intent, route mode/points, and compatibility fields. Endpoints are either free canvas points or semantic station ports. |
| 7 | Routing system | Orthogonal route generation uses endpoint coordinates and port-side constraints, with standoffs and route simplification. Connectors support manual route points, legacy segment offsets, bend/segment dragging, route reset, endpoint dragging, port hit-testing, and crossing jumps. The automatic route is geometry-based, not an obstacle-avoidance router. |
| 8 | Rendering system | `renderNodes()` rebuilds HTML equipment elements and ports; `renderWires()` rebuilds SVG connector paths, handles, and labels. `renderAll()` invokes the node/wire/property renderers and page/sheet updates. Node movement updates its DOM position during the gesture; wires are redrawn as it moves. |
| 9 | Selection | Single selection is represented as `{kind,id}`. Click selects; double-click opens station or stream properties; right-click opens context actions. Multi-select and marquee selection are not implemented in the inspected canvas code. |
| 10 | Snapping | Connector endpoints snap to compatible visible ports using a screen-space hit radius and feedback. Grid visibility exists, but grid snapping for node movement, edge/center snapping, and smart guides were not found. |
| 11 | Viewport | A fixed 2200 × 1400 world is CSS-scaled; zoom is clamped to 45–155%, with zoom in/out/reset and fit-to-content. Scrollbars provide navigation. Page records have pan fields, but drag-to-pan, wheel zoom, minimap, and rulers were not found. |
| 12 | History | Undo/redo uses full canonical JSON snapshots, capped at 80 entries. Station property editing has an OK/Cancel transaction. Connector gestures push at most one snapshot per drag. |
| 13 | Persistence | Save produces canonical version-5 JSON; it uses browser recovery storage, File System Access when available, then download fallback. Open accepts JSON files. `prepareState()` migrates page-less saves and legacy stream records; `canonicalizeLoadedConnector()` restores endpoint direction, model fields, and role semantics. |
| 14 | Import/export | JSON project open/save, browser templates, recovery, per-page/all-page JSON export, print/PDF, station/stream CSV, and Excel export through a backend request are present. No dedicated SVG/PNG editor export was found in this audit. |
| 15 | Engineering model | The domain model is embedded in `main.js` rather than separated into modules. Nodes and connectors retain engineering identity and data; stream role is derived from topology and boundary intent, not connector appearance. |
| 16 | Engineering calculations | Station solvers include Pan, Crystallizer, 2/3-output Centrifugal, Mixer, Receiver, Splitter, Distributor, Evaporator, Surface Heater, Injection Heater, Flash Tank, Melter, and Magma. Shared stream calculations include a 15-component ledger and material/water-steam property evaluation. |
| 17 | Solver | `runPhase23Solver()` operates on structured in-memory node/connector state: validate, resolve external boundaries, pressure feedback and required flows, then propagate through station calculation passes. Injection Heater is now in the enabled-engine set and has a focused integration regression test. |
| 18 | Validation | Topology and port compatibility are checked before solve. There are station-specific connection requirements, required-flow and pressure-feedback paths, input-state validation, and stream property checks. |
| 19 | Diagnostics | Solver issues map to station/stream panels and fields. Solver Audit records execution, required-flow and pressure paths, stream statuses, station readiness, and messages. Station panels also show local audit summaries. |
| 20 | UI architecture | HTML/CSS owns the shell: top bar/ribbon, left station palette, center canvas/page tabs, right engineering properties, status, and dialogs. Most behavior is bound from the IIFE in `main.js`. |
| 21 | Dialogs | Station property window, stream property window, Pan Design, sizing tools, centrifugal evaluation dialogs, page setup, context menus, solver issue/audit dialogs, and report dialogs are present. |
| 22 | Properties panel | Existing domain forms are authoritative. Pan, Evaporator, Heater, Injection Heater, Melter, Flash Tank, Crystallizer, Centrifugals, Magma, and Distributor have tailored content; other station types use generic parameter controls. Universal Flow has separate free-stencil, boundary-stream, internal-flow, and full stream-property views. |
| 23 | Ribbon | Ribbon tabs/groups are assembled in `main.js` and include File, Home, Insert, Design, Data, Process, View/Help-related actions. It is already application-owned; maxGraph does not need to supply or replace it. There is not yet a general command registry independent of the UI callbacks. |
| 24 | Keyboard shortcuts | Ctrl/Cmd+Z and Ctrl/Cmd+Y drive existing undo/redo. Page navigation and new-page shortcuts are present. A complete Visio-style edit/arrange shortcut map was not found. |
| 25 | Engineering reports | Solver audit, station/stream tables, CSV, backend Excel, JSON exports, and print output exist. Keep these bound to engineering state, not maxGraph presentation cells. |

## Core Function Map

These are the current implementation points corresponding to the attachment's requested function inventory. They live in `js/main.js` inside the application IIFE; the names are not separate service/module APIs yet.

| Concern | Current functions / equivalents |
|---|---|
| State, migration, persistence | `canonicalStateObject()`, `snapshotStateJSON()`, `canonicalizeLoadedConnector()`, `rehydrateCurrentState()`, `restoreStateObject()`, `prepareState()`, `pushHistory()`, `markChanged()` |
| Node creation/render/drag | `createNode()`, `renderNodes()`, `addPorts()`, `setupNodeDrag()`, `selectItem()`, `renderProps()` |
| Wire rendering | `renderWires()`, `wirePath()`, `segmentOf()`, `orthogonalIntersection()`, `computeConnectorJumps()`, `pathWithJumps()` |
| Port connection and snapping | `beginNewConnectorFromPort()` (wrapper), `beginUniversalConnectionFromPort()`, `beginExistingEndpointDrag()`, `connectorCanGlueToPort()`, `glueConnectorEndpointToPort()`, `tryGlueSelectedConnectorAtPort()`, `portCompatibilityForEndpoint()`, `visiblePortCandidates()`, `hitTestPortScreen()` |
| Route editing | `routeOrthogonalBase()`, `computedConnectorVertices()`, `setConnectorManualVertices()`, `resetConnectorAutoRoute()`, `connectorManualOffset()`, `beginSegmentDrag()`, `beginBendDrag()` |
| Domain topology | `connectorRole()`, `connectorSolverActive()`, `connectorTopologyIssues()`, `connectedStreamsForPort()`, `connectorFeedsPanHeatingPort()`, `connectorFeedsPanProcessPort()`, `connectorFeedsCrystallizerProcessPort()`, `connectorFeedsCentrifugalWashPort()`, `connectorFeedsCentrifugalMassecuitePort()` |
| Properties and audit | `stationPressureFeedbackHtml()`, `stationAuditSummaryHtml()`, `openStationProperties()`, `renderNodeProps()`, `renderSolverAudit()` |
| Solver and stream engine | `structuralValidation()`, `solveImplementedStation()`, `runPhase23Solver()`, `solveStation()`, `calculateUniversalStream()` |

## Equipment and Engine Coverage

**Visible palette:** Pan, Evaporator, Compressor, Thermocompressor, Crystallizer, 2-Output Centrifugal, 3-Output Centrifugal, Melter, Magma Mixer, Surface Heater, Injection Heater, Flash Tank, Contact Condenser, Surface Condenser, Dryer, Cooler, Turbine, Turbo Alternator, Pressure Reducer, Pump, Tank, Reactor, Separator/Filter, Universal Flow, General Mixer, Splitter, Distributor, Receiver, and Seed/Slurry Source.

**Enabled station calculation engines:** Pan, Evaporator, Crystallizer, 2/3-output Centrifugal, Melter, Magma Mixer, Surface Heater, Direct Injection Heater, Flash Tank, General Mixer, Splitter, Distributor, and Receiver.

**Station engines not implemented in the current solver:** Compressor, Thermocompressor, Contact Condenser, Surface Condenser, Dryer, Cooler, Turbine, Turbo Alternator, Pressure Reducer, Pump, Tank, Reactor, and Separator/Filter. Their definitions/property controls do not imply a calculation engine. Universal Flow uses the shared stream-property engine; Seed is a boundary source rather than a station balance.

## Integration-Critical Findings

1. Pages currently contain their own node and connector collections. The active page is what the solver sees; the Insert ribbon explicitly says cross-page process references are unavailable. Duplicating a page creates new equipment IDs. A shared cross-page engineering network is therefore a separate domain-model change, not part of a canvas skin.
2. `markChanged()` currently resets all node/connector solve states. Node movement and connector route gestures eventually call it, so a route-only edit can invalidate solver readiness even though source, destination, port, and stream meaning did not change. The editor migration must separate presentation-geometry changes from engineering/topology/property changes.
3. Universal Flow supports free/dangling endpoints and normalizes connected streams to output → input. Standard graph-edge assumptions must not silently attach, reverse, or eliminate those endpoints.
4. The current ribbon and property windows should be adapted, not replaced by maxGraph's editor dialogs or history system.
5. Official maxGraph usage expects a package/bundler workflow; this plain-script application has none today. A minimal build wrapper is a deployment/tooling addition, but does not require moving the solver or domain model.

## Primary Code References

- [Entry page](index.html)
- [Application state and page manager](js/main.js#L20)
- [Canonical state and connector migration](js/main.js#L1359)
- [Change invalidation behavior](js/main.js#L1529)
- [Node definitions](js/main.js#L310)
- [Canvas node renderer](js/main.js#L1904)
- [Connector routing and manual geometry](js/main.js#L2587)
- [Property-window routing](js/main.js#L4001)
- [Network solver](js/main.js#L11273)
- [Ribbon construction](js/main.js#L14050)
- [Existing ribbon/multipage plan](Sugar_Ribbon_Multi_Page_Workspace_Implementation_Plan.md)