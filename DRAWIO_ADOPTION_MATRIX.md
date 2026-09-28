# Diagram-Editor Adoption Matrix

This matrix compares verified Sugar application behavior with mature diagram-editor capabilities. “Adopt” means improve the interaction/rendering layer while preserving Sugar's domain model and solver. It does not mean importing draw.io code or data formats.

| Capability | Current Sugar implementation | Reference/editor capability | Action for this project | Domain impact |
|---|---|---|---|---|
| Equipment identity | Stable node IDs, station number, tag, type code, parameters | Cells carry IDs/user objects | Map graph cell IDs to existing node IDs; never regenerate identity on redraw | None |
| Equipment shapes | HTML-rendered Sugar stations from `nodeDefs` | Custom shapes, style registries | Render custom Sugar station shapes with labels, identity, status, and semantic ports | None |
| Stencil library | 29 visible palette entries; drag/double-click creation | Drag-source palettes and stencil viewers | Reuse the existing categorized palette first; route insert commands through the existing node creation API | None |
| Ports | Named fixed-side input/output ports with category acceptance | Anchors/constraints and connection validation | Preserve existing port IDs/sides/acceptance; use graph connection constraints or port cells as a rendering detail | None |
| Connector identity | Stable connector ID and semantic endpoint references | Edge cells with terminals | Map edge ID to connector ID; keep current connector object as authority | None |
| Universal Flow | Free, dangling, boundary, and internal stream forms; topology-derived role | Edges may have terminals or free points | Add a custom endpoint adapter; preserve free endpoints, role intent, and output-to-input normalization | Must preserve exactly |
| Port validation | Compatibility, direction, occupancy, topology checks | Pre-connect validators | Call current validation before accepting a graph connection; display its rejection reason | None |
| Orthogonal routing | Direction-aware orthogonal routing and crossing jumps | Multiple edge styles and routers | Start with maxGraph orthogonal rendering; compare output and retain custom Sugar route behavior where needed | Geometry only |
| Obstacle avoidance | Not present in current automatic route calculation | Advanced route/layout options | Treat as a later enhancement, behind the route-parity tests | Geometry only |
| Manual route editing | Endpoint, segment, bend, reset, and route persistence | Edge handlers and custom handles | Map graph edge handles to current `route_points` and route mode; preserve one undo step per gesture | Geometry only |
| Selection | Single node or connector selection | Multi-selection, marquee, keyboard selection | Add multi-select/marquee incrementally; keep selection IDs in app UI state and forward to current property views | None |
| Port snapping | Compatible-port hit testing with screen-space feedback | Magnetic terminals/guides | Preserve Sugar compatibility filtering; maxGraph must not accept arbitrary terminals | Topology only on commit |
| Grid/smart guides | Grid visibility exists; port snap exists; no grid snap or smart guides found | Grid, guides, edge/center/spacing snapping | Add visual grid and smart alignment as view features; persist settings only as presentation metadata | None |
| Viewport | Zoom/reset/fit and scrollbars; fixed world; no minimap/rulers found | Pan, wheel zoom, fit, minimap, rulers | Use maxGraph viewport plugins and controls; map zoom/page state back to existing page fields | None |
| Undo/redo | JSON snapshots, max depth 80, station edit transaction | Model-level undo managers | Keep one authoritative Sugar history. Do not enable an independent maxGraph undo stack. | Preserve current project history |
| Geometry invalidation | `markChanged()` currently resets solver state even after visual edits | Diagram editors separate geometry from business data | Introduce explicit presentation-change vs engineering-change paths before/with canvas replacement | Required behavior fix |
| Pages | Page manager, page tabs, order/rename/duplicate/setup, per-page nodes and connectors | Multipage diagrams | Preserve current page structure and active-page rendering; do not imply cross-page engineering links | Page-local today |
| Cross-page networks | Not supported; solver resolves active page independently | Shared linked diagrams / off-page references | Defer. Requires an explicit engineering-model decision and project migration, not a renderer feature | Significant model change |
| Layers | No layer model found | Hide/lock/reorder layers | Add later as presentation-only grouping; hidden layers must not remove nodes from engineering state | None if visual only |
| Groups | No general graph grouping found | Group/ungroup and containers | Add later with view-only group objects; do not translate groups into process stations | None unless explicitly mapped |
| Engineering properties | Existing station/stream panels and dialogs | Generic format/property inspector | Keep Sugar Engineering panels; add a separate visual Format section only for diagram styling | Keep domain properties authoritative |
| Ribbon | Existing custom ribbon tabs and command callbacks | Application-specific ribbon/toolbars | Restyle/extend current ribbon and route actions through existing commands; maxGraph does not supply a complete Visio ribbon | None |
| Persistence | Version-5 JSON with migration/normalization | Graph XML/model serialization | Keep current JSON as the project format; graph cells are rebuilt from state on load | Must preserve old files |
| Exports | JSON/page JSON, CSV, Excel backend, print/PDF | SVG/PNG and diagram exports | Keep existing exports; add SVG/PNG only after graph rendering parity and export acceptance | None |
| Solver and audit | Sugar-specific balances, property calculations, validation and audit | Generic graph algorithms | Never delegate process meaning or calculations to the diagram engine | No substitution |
| Performance | HTML/SVG rebuilds on render calls; wires redraw during movement | Incremental model/view updates | Use incremental graph updates and batch changes; benchmark realistic large PFDs before removing old renderer | None |

## Draw.io Reference Use

Study [draw.io](https://github.com/jgraph/drawio) and [draw.io libraries](https://github.com/jgraph/drawio-libs) for interaction patterns, file/page/layer UX, and palette concepts. Do not copy its application or schema. Use [maxGraph](https://github.com/maxGraph/maxGraph) as the candidate graph rendering/interaction library and adapt it to Sugar's connector contracts.

Useful maxGraph references include its [toolbar story](https://github.com/maxGraph/maxGraph/blob/main/packages/html/stories/Toolbar.stories.ts), [stencil story](https://github.com/maxGraph/maxGraph/blob/main/packages/html/stories/Stencils.stories.ts), and [selected-features example](https://github.com/maxGraph/maxGraph/tree/main/packages/ts-example-selected-features). Prefer `BaseGraph` with explicitly selected plugins over adopting a full editor shell.