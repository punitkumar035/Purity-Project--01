# Sugar Engineering Process Simulator
## Ribbon + Visio-Style Multi-Page Workspace — Implementation Plan

**Status:** Implementation specification  
**Scope:** Professional Ribbon UI + unlimited/multi-page drawing workspace  
**Engineering authority:** Sugar's Help Book  
**Principle:** UI/workspace features must consume the engineering model; they must not invent or redefine engineering equations, properties, equipment meaning, or network semantics.

---

## 1. Objective

Upgrade the current Sugar Engineering Process Simulator from a single drawing canvas into a professional engineering-document application with:

- a Visio/Office-style Ribbon;
- all existing application functions preserved;
- multiple drawing pages inside one project;
- page tabs and page navigation;
- add, duplicate, rename, delete and reorder pages;
- page-specific canvas state;
- project-wide engineering/model state;
- contextual Ribbon controls;
- save/load and migration from the current single-page format;
- print/export of one, selected, or all pages;
- centralized commands, undo/redo and keyboard shortcuts;
- integration with the existing engineering, property, calculation, equipment and network architecture.

The application model becomes:

```text
PROJECT
├── Engineering Model
├── Network Model
├── Source Registry
├── Calculation State
├── Project Settings
└── PAGES
    ├── Page 1
    ├── Page 2
    ├── Page 3
    └── ...
```

---

# 2. Architecture Rule

The Ribbon and multi-page system are application/UI layers.

```text
Sugar's Help Book
        ↓
Source Intelligence
        ↓
Engineering Architecture
        ↓
Stencil / Property / Calculation / Equipment
        ↓
Network / PFD
        ↓
Application State
        ├── Ribbon
        └── Multi-Page Workspace
```

The new UI must **not**:

- create duplicate calculation logic;
- invent engineering defaults;
- redefine equipment variants;
- redefine stream/port semantics;
- create a second property-window architecture;
- alter source-defined engineering meaning.

---

# 3. Multi-Page Project Model

## 3.1 Project-scoped data

Project scope may contain:

- project ID/name;
- project metadata;
- page registry/order;
- engineering model registry;
- equipment registry;
- network registry;
- source references;
- project-wide units/settings;
- revision/audit information.

## 3.2 Page-scoped data

Each page contains:

- page ID/name/order;
- page dimensions/orientation;
- objects and their visual geometry;
- connectors and connector geometry;
- layers;
- guides;
- grid/snap settings;
- rulers;
- viewport/zoom/pan;
- page-specific annotations;
- page metadata.

Engineering identity must remain separate from drawing position.

Example:

```text
Equipment ID: equipment-00042
Page ID:      page-00003
Stencil ID:   <canonical stencil>
Model ID:     <canonical equipment model>
```

Moving an object between pages must not silently create a new engineering object.

---

# 4. Page Manager

Create a dedicated Page Manager responsible for:

```text
createPage()
deletePage()
duplicatePage()
renamePage()
activatePage()
movePageLeft()
movePageRight()
movePageToStart()
movePageToEnd()
nextPage()
previousPage()
setPageSize()
setPageOrientation()
serializePages()
restorePages()
```

Command IDs should include:

```text
PAGE_CREATE
PAGE_DELETE
PAGE_DUPLICATE
PAGE_RENAME
PAGE_MOVE_LEFT
PAGE_MOVE_RIGHT
PAGE_MOVE_FIRST
PAGE_MOVE_LAST
PAGE_ACTIVATE
PAGE_NEXT
PAGE_PREVIOUS
PAGE_SETUP
```

---

# 5. Page Navigation UI

Provide a Visio-style page-tab strip below the canvas:

```text
┌──────────────────────────────────────────────────────────────┐
│                         DRAWING CANVAS                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
┌──────────┬──────────┬──────────┬──────────┬─────────────────┐
│ Page 1   │ Page 2   │ Page 3   │ Page 4   │ + Add Page      │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
```

Required:

- active-page highlight;
- Add Page;
- page context menu;
- rename;
- duplicate;
- delete;
- reorder;
- next/previous navigation;
- overflow navigation for many pages;
- optional page-thumbnail navigator.

Right-click page menu:

```text
Rename
Duplicate
Delete
Move Left
Move Right
Move to Beginning
Move to End
Page Setup
Export Page
Print Page
```

---

# 6. Page Lifecycle

When switching pages:

```text
User selects Page 3
      ↓
Save current page state
      ↓
Activate Page 3
      ↓
Render Page 3
      ↓
Restore selection/viewport/page settings
      ↓
Update Property Window
      ↓
Update Contextual Ribbon
      ↓
Update network visualization
```

Switching pages must not unnecessarily recalculate the whole engineering model.

Only the active page needs full canvas rendering.

---

# 7. Page Data Schema

Conceptual schema:

```javascript
{
  id: "page-0001",
  name: "Page 1",
  order: 0,
  size: { width: ..., height: ... },
  orientation: "landscape",
  viewport: { zoom: 1, panX: 0, panY: 0 },
  grid: { visible: true, snap: true, size: ... },
  rulers: { visible: true },
  guides: [],
  layers: [],
  objects: [],
  connectors: [],
  metadata: {}
}
```

Exact fields must be reconciled with the current application rather than blindly duplicating existing state.

---

# 8. Project Serialization

Project files must preserve:

```text
Project metadata
Page order
Page settings
Objects
Object IDs
Object properties
Connectors
Network references
Layers
Guides
Viewport
Engineering references
Schema version
```

Use a versioned schema:

```json
{
  "schemaVersion": 1,
  "project": {},
  "pages": []
}
```

A migration layer is mandatory.

---

# 9. Backward Compatibility

Current single-page projects must migrate to:

```text
Existing Project
     ↓
Migration Layer
     ↓
Project
└── Page 1
    ├── Existing objects
    ├── Existing connectors
    └── Existing state
```

No existing object/property/connection may be silently discarded.

---

# 10. Cross-Page References

Support an architecture for off-page process references where required:

```text
Page 1
  Stream A
      ↓
 [Off-page reference]
      ↓
Page 2
  Stream A
```

Possible implementations:

- off-page connector;
- named stream reference;
- network object reference;
- cross-page navigation link.

The **Network Architecture owns engineering semantics**. The page layer only provides visual representation/navigation. If the Help Book does not define a particular cross-page engineering rule, mark it as an architecture decision rather than inventing one.

---

# 11. Ribbon Structure

Primary tabs:

```text
File
Home
Insert
Design
Data
Process
Review
View
Developer
Help
```

## Home

### Clipboard
```text
Paste
Cut
Copy
Format Painter
```

### Font
```text
Font
Font Size
Increase Font
Decrease Font
Bold
Italic
Underline
Strikethrough
Text Color
```

### Paragraph
```text
Align Left
Center
Align Right
Justify
Bullets
Numbering
Indent
Outdent
```

### Tools
```text
Pointer
Pan
Connector
Orthogonal Connector
Straight Connector
Curved Connector
Line
Arrow
Text
Callout
Dimension
```

### Shape Styles
```text
Fill
Line
Effects
Quick Styles
```

### Arrange
```text
Align
Distribute
Position
Bring Forward
Bring to Front
Send Backward
Send to Back
Group
Ungroup
```

---

# 12. Insert Tab

```text
Equipment
Stream
Text
Table
Image
Annotation
Calculation Block
```

Equipment galleries must come from the canonical stencil/equipment registry.

---

# 13. Design Tab

```text
Page Setup
Page Size
Orientation
Margins

Grid
Snap
Rulers
Guides

Background
Theme
```

Page Setup is also the entry point for page dimensions/orientation.

---

# 14. Data Tab

```text
Properties
Engineering Data
Equipment Data
Stream Data
Units
Conversion
Import
Export
```

The Property Architecture remains the owner of engineering property definitions.

---

# 15. Process Tab

```text
Calculate
Calculate Selection
Calculate Network
Calculate All

Material Balance
Energy Balance
Water Balance
Steam Balance

Forward Solve
Backward Solve
Required Flow
Recalculate
Reset
```

Buttons invoke calculation/network commands; equations remain in the Calculation Architecture.

---

# 16. Review Tab

```text
Validate Model
Validate Connections
Check Units
Check Balance
Check Required Inputs
Errors
Warnings
Source Reference
Calculation Trace
Audit Trail
```

---

# 17. View Tab

```text
Zoom In
Zoom Out
100%
Fit Page
Fit Selection

Equipment Library
Properties
Layers
Calculations
Validation
Flow Legend

Grid
Rulers
Guides
Ports
Flow Direction
Labels
```

Page-tab visibility may also be controlled here.

---

# 18. Developer Tab

```text
Model Inspector
JSON Inspector
Equipment Registry
Stencil Registry
Property Registry
Calculation Registry
Network Inspector
Source Inspector

Console
State
Event Log
Performance

Unit Tests
Engineering Tests
Network Tests
Regression Tests
```

---

# 19. Help Tab

```text
Sugar's Help Book
Engineering Reference
Equipment Documentation
Calculation Documentation
Keyboard Shortcuts
Tutorial
About
```

Help/source actions must use the authoritative project source.

---

# 20. File Menu

```text
New Project
Open Project
Save
Save As
Save Copy

Import
Export

Recent Projects
Project Information
Settings
```

Export targets:

```text
Current Page
Selected Pages
All Pages
```

---

# 21. Command Architecture

Do not attach business logic directly to Ribbon buttons.

Use:

```text
Ribbon Control
      ↓
Command ID
      ↓
Command Manager
      ↓
Application Service
      ↓
Engineering/UI subsystem
```

Examples:

```text
CMD_COPY
CMD_PASTE
CMD_GROUP
CMD_ALIGN

CMD_PAGE_CREATE
CMD_PAGE_DUPLICATE
CMD_PAGE_DELETE
CMD_PAGE_RENAME

CMD_INSERT_EQUIPMENT
CMD_INSERT_STREAM

CMD_CALCULATE
CMD_CALCULATE_NETWORK
CMD_VALIDATE

CMD_ZOOM_IN
CMD_ZOOM_OUT
```

This permits the same commands to be used by Ribbon, context menus, keyboard shortcuts and future automation/agents.

---

# 22. Central Application State

Track at least:

```text
Active Project
Active Page
Selection
Current Tool
Active Ribbon Tab
Open Panels
Zoom
Viewport
Calculation State
Validation State
```

Ribbon, Canvas, Property Window and panels should subscribe to state changes instead of maintaining conflicting copies.

---

# 23. Contextual Ribbon

Selection determines contextual controls.

```text
No selection
    → General Home controls

Equipment selected
    → Equipment-specific controls

Stream selected
    → Stream-specific controls

Multiple objects selected
    → Align / Group / Arrange controls

Page selected
    → Page Setup controls
```

Controls consume canonical model metadata.

---

# 24. Undo / Redo

Undo/redo must include:

- page create/delete/rename/reorder;
- page duplication;
- object insertion/deletion/movement;
- resizing;
- connections;
- property edits;
- grouping;
- formatting;
- relevant page settings.

Use command history rather than ad-hoc DOM reversal.

---

# 25. Performance

Do not render all pages simultaneously.

Preferred model:

```text
Project Registry
 ├── Page 1 data
 ├── Page 2 data
 ├── Page 3 data
 └── ...

          ↓

Active Page Renderer
```

Requirements:

- lazy rendering of inactive pages;
- no unnecessary full-project recalculation on page switching;
- efficient page thumbnails if implemented;
- stable behavior with many pages and large PFDs.

---

# 26. Suggested Modules

Adapt names to the current repository rather than duplicating existing systems.

```text
/ribbon/
  ribbon-core
  ribbon-tabs
  ribbon-controls
  ribbon-command-bindings
  ribbon-contextual

/commands/
  command-manager
  command-registry
  command-history
  keyboard-manager

/pages/
  page-model
  page-manager
  page-navigation
  page-renderer
  page-serialization
  page-migration

/workspace/
  canvas-manager
  viewport-manager
  selection-manager
  tool-manager

/project/
  project-manager
  project-schema
  project-serialization
  project-migration
```

Existing engineering modules remain owners of engineering behavior.

---

# 27. Implementation Sequence

## R1 — Architecture Contracts
Define:

- project/page schema;
- Page Manager API;
- command registry;
- application state;
- serialization/migration contracts;
- Ribbon control contracts.

## R2 — Multi-Page Core
Implement:

1. Page model.
2. Page Manager.
3. Active page.
4. Create.
5. Switch.
6. Rename.
7. Delete.
8. Duplicate.
9. Reorder.
10. Serialization.

## R3 — Canvas Integration
Connect Page Manager to the existing canvas without replacing engineering/network logic.

## R4 — Page Navigation
Implement:

- page tabs;
- Add Page;
- context menu;
- navigation;
- optional thumbnails.

## R5 — Ribbon Foundation
Implement:

- Ribbon shell;
- tabs;
- groups;
- buttons;
- dropdowns;
- galleries;
- tooltips;
- enabled/disabled states.

## R6 — Home Ribbon
Reproduce the uploaded Ribbon's functional organization.

## R7 — Remaining Ribbon
Implement:

```text
Insert
Design
Data
Process
Review
View
Developer
Help
```

## R8 — Contextual Ribbon
Bind controls to selection/application state.

## R9 — Persistence
Implement save/load, schema versioning and migration.

## R10 — Export/Print
Implement current/selected/all page export and print.

## R11 — Performance
Optimize large multi-page projects.

## R12 — QA / Regression
Run full Ribbon + multi-page + engineering regression.

---

# 28. Agent Ownership

```text
Master Agent
  → roadmap/dependencies/integration

Engineering Architecture Agent
  → canonical engineering contracts

Stencil Agent
  → equipment stencils

Property Agent
  → property schemas

Calculation Agent
  → engineering calculations

Equipment Agent
  → equipment behavior

Network Agent
  → ports/streams/connections/network solving

UI/Ribbon Agent
  → Ribbon/page presentation/command binding

Integration Agent
  → connects UI to established services

QA Agent
  → functional/regression tests

Debugger Agent
  → defect repair

Engineering Review Agent
  → engineering/source acceptance

Documentation Agent
  → final documentation
```

---

# 29. QA Matrix

## Ribbon
- tab switching;
- buttons/dropdowns;
- disabled states;
- contextual states;
- keyboard shortcuts;
- command routing;
- undo/redo.

## Pages
- create;
- rename;
- duplicate;
- delete;
- reorder;
- switch;
- save/load;
- migration;
- page settings.

## Canvas
- placement;
- movement;
- selection;
- connectors;
- zoom;
- pan;
- grid;
- snap;
- rulers;
- guides.

## Engineering Integrity
Verify that page/ribbon operations do not:

- alter engineering equations;
- corrupt equipment identity;
- corrupt properties;
- corrupt streams;
- redefine network semantics;
- trigger unnecessary calculations.

## Export
Verify:

- current page;
- selected pages;
- all pages;
- page ordering;
- dimensions;
- content completeness.

---

# 30. Acceptance Checklist

### Ribbon
- [ ] Ribbon shell implemented.
- [ ] Home matches intended functional structure.
- [ ] Existing application controls retained.
- [ ] Insert implemented.
- [ ] Design implemented.
- [ ] Data implemented.
- [ ] Process implemented.
- [ ] Review implemented.
- [ ] View implemented.
- [ ] Developer implemented.
- [ ] Help implemented.
- [ ] Contextual controls implemented.
- [ ] Central command registry implemented.
- [ ] Keyboard shortcuts implemented.
- [ ] Undo/redo implemented.

### Multi-Page
- [ ] Multiple pages supported.
- [ ] Add/create works.
- [ ] Rename works.
- [ ] Duplicate works.
- [ ] Delete works.
- [ ] Reorder works.
- [ ] Page navigation works.
- [ ] Page-specific state persists.
- [ ] Objects remain associated with their pages.
- [ ] Engineering IDs remain stable.
- [ ] Single-page projects migrate correctly.
- [ ] Multi-page projects save/load correctly.
- [ ] Current/selected/all-page export works.

### Engineering Integrity
- [ ] Help Book remains authoritative.
- [ ] Ribbon contains no engineering equations.
- [ ] Page system does not redefine network semantics.
- [ ] Property Architecture remains authoritative.
- [ ] Calculation Engine remains authoritative.
- [ ] Equipment Models remain authoritative.
- [ ] Network Agent remains authoritative.
- [ ] Source traceability remains intact.

---

# 31. Final Target UX

```text
┌─────────────────────────────────────────────────────────────────────┐
│ File Home Insert Design Data Process Review View Developer Help     │
├─────────────────────────────────────────────────────────────────────┤
│ Ribbon commands                                                     │
├───────────────────┬─────────────────────────────────────────────────┤
│ Equipment Library │                                                 │
│                   │              ENGINEERING CANVAS                 │
│                   │                                                 │
│                   │          Active Drawing Page                   │
│                   │                                                 │
├───────────────────┴─────────────────────────────────────────────────┤
│ Page 1 │ Page 2 │ Page 3 │ Page 4 │ Page 5 │ +                     │
├─────────────────────────────────────────────────────────────────────┤
│ Status │ Grid │ Snap │ Zoom │ Selection │ Calculation │ Validation  │
└─────────────────────────────────────────────────────────────────────┘
```

The final application should therefore be treated as a **multi-page engineering project/document system**, not as several unrelated canvases.

The two major UI subsystems are:

1. **Ribbon Command System**
2. **Multi-Page Project Workspace**

Both must sit above and consume the established engineering architecture.
