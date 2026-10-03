# Migration Plan

## Overview

This document outlines the migration strategy for evolving the existing Sugar Engineering application toward a professional diagramming architecture while preserving 100% backward compatibility for existing engineering projects and solver functionality.

## Current State Assessment

Based on the Architecture Audit and Draw.io Adoption Matrix:
- **Engineering model**: ✅ Fully functional and correct (34+ equipment types, solver, calculations)
- **Diagram editor**: ✅ Functional but basic (single selection, port snapping, orthogonal routing)
- **Persistence**: ✅ Robust (JSON, File System Access, browser recovery, templates)
- **Professional features**: ❌ Missing (multi-selection, groups, layers, minimap, rulers, smart guides)

## Migration Principles

1. **Never break existing project files** — V5 JSON must open in new versions
2. **Never silently lose data** — Unknown fields preserved whenever possible
3. **Engineering model is authoritative** — Visual changes ≠ engineering changes
4. **Incremental refactoring** — Extract modules one at a time with behavioral equivalence
5. **Backward-compatible state extensions** — Add new fields without breaking old loads

## State Schema Evolution Plan

### Current V5 State Schema (Baseline)
```javascript
{
  version: 5,
  schemaVersion: 1,
  name: 'New Massecuite Scheme',
  activePageId: 'page_1',
  pages: [
    {
      id, name, order, layout, orientation, zoom, panX, panY,
      nodes: [], connectors: [], streams: []
    }
  ],
  nodes: [],
  connectors: [],
  streams: [],
  flowLegendsOn: false,
  showSheetFrame: true,
  gridVisible: true,
  snapToGrid: true
}
```

### Migration Path to V6
- **V6**: Add professional diagramming features to state while keeping V5 structure intact
- **New top-level fields**: `layers`, `groups`, `selectionMode`, `multiSelect`, `smartGuidesOn`
- **Per-page extensions**: Add `layerVisibility`, `groupDefinitions`
- **Preserve**: All V5 fields and semantics
- **Unknown field preservation**: During load, copy unknown fields to migrated state

### V6 State Additions (Backward-Compatible)
```javascript
{
  // ... all V5 fields preserved ...
  
  // Diagram editor enhancements
  multiSelectEnabled: true,        // Allow multi-select operations
  selectionMode: 'single'|'add'|'subtract', // For Ctrl/Cmd modifier behavior
  smartGuidesOn: true,             // Smart guides toggle
  layerManagerEnabled: true,       // Layer system active
  
  // Multi-selection tracking
  multiSelect: [                   // Array of selected object IDs when multi-select active
    'node_A1',
    'connector_S1'
  ],
  
  // Layer system (per-page)
  pages: [
    {
      // ... existing V5 page fields ...
      layerDefinitions: [          // Defined layers for this page
        { id: 'layer_1', name: 'Process Equipment', visible: true, locked: false },
        { id: 'layer_2', name: 'Process Streams', visible: true, locked: false },
        { id: 'layer_3', name: 'Steam', visible: true, locked: false },
        { id: 'layer_4', name: 'Condensate', visible: true, locked: false },
        { id: 'layer_5', name: 'Utilities', visible: true, locked: false },
        { id: 'layer_6', name: 'Instrumentation', visible: false, locked: false },
        { id: 'layer_7', name: 'Annotations', visible: false, locked: false }
      ],
      layerVisibility: {           // Runtime visibility overrides (per-page)
        'layer_1': true,
        'layer_2': true,
        'layer_3': true,
        'layer_4': true,
        'layer_5': true,
        'layer_6': false,
        'layer_7': false
      },
      groupDefinitions: [          // Defined groups for diagram organization
        { id: 'group_1', name: 'Clarification Station', 
          members: ['node_A1', 'node_B1', 'node_C1'], 
          isEngineeringGroup: false }  // true if maps to engineering station/container
      ]
    }
  ]
}
```

### Migration Functions

```javascript
function migrateV5ToV6(v5State) {
  const v6State = { ...v5State }; // Spread preserves all V5 fields
  
  // Add new top-level fields with safe defaults
  v6State.multiSelectEnabled = true;
  v6State.selectionMode = 'single';
  v6State.smartGuidesOn = true;
  v6State.layerManagerEnabled = true;
  v6State.multiSelect = [];
  
  // Migrate each page
  if (v6State.pages && Array.isArray(v6State.pages)) {
    v6State.pages = v6State.pages.map(page => {
      const migratedPage = { ...page };
      
      // Add layer definitions if not present (backward compatibility)
      if (!migratedPage.layerDefinitions) {
        migratedPage.layerDefinitions = [
          { id: 'layer_default', name: 'Default', visible: true, locked: false }
        ];
        migratedPage.layerVisibility = { 'layer_default': true };
      }
      
      // Add group definitions if not present
      if (!migratedPage.groupDefinitions) {
        migratedPage.groupDefinitions = [];
      }
      
      return migratedPage;
    });
  }
  
  return v6State;
}

function migrateV6ToV7(v6State) {
  // Future migrations follow same pattern
  // Always preserve unknown fields
  const v7State = { ...v6State };
  // ... V6 to V7 changes ...
  return v7State;
}

// Load-time migration dispatcher
function loadProjectObject(obj) {
  const version = obj.version ?? 5;
  
  switch (version) {
    case 5:
      return migrateV5ToV6(obj);
    case 6:
      return migrateV6ToV7(obj);
    case 7:
      // Current version - no migration needed
      return obj;
    default:
      throw new Error(`Unsupported project version: ${version}`);
  }
}
```

## Module Extraction Plan (Phase 1)

### Goal: Extract core concerns into separate modules without changing behavior

#### Priority 1: State Management (Low Risk)
- **File**: `core/state.js`
- **Contents**:
  - State schema definition and defaults
  - `snapshotStateJSON()`, `canonicalStateObject()`
  - `pushHistory()`, `markChanged()`
  - Version migration functions (`migrateV5ToV6()`)
  - Page management (`ensurePageModel()`, `activePage()`, `saveActivePageData()`)
- **Interface**: Export state object and mutation functions
- **Verification**: Before/after extraction behavioral equivalence

#### Priority 2: Diagram Core (Low-Medium Risk)
- **Files**:
  - `diagram/ports.js` — Port definitions, compatibility, snapping logic
  - `diagram/nodes.js` — Node types, rendering, equipment models
  - `diagram/connectors.js` — Connector model, properties, endpoint attachment
  - `diagram/routing.js` — Orthogonal routing engine (`routeOrthogonalBase`, `computedConnectorVertices`)
- **Interface**: Pure functions operating on plain objects
- **Verification**: Render output identical before/after

#### Priority 3: Persistence & History (Low Risk)
- **Files**:
  - `core/persistence.js` — Save/load, File System Access, recovery, templates
  - `core/history.js` — Undo/redo stack, `pushHistory()`, snapshot management
- **Interface**: Async save/load functions, history control
- **Verification**: Save/load roundtrip produces identical state

#### Priority 4: Solver & Calculations (Medium Risk - Preserve Sugar Semantics)
- **Files**:
  - `solver/topology.js` — Network solver, required-flow/pressure paths
  - `solver/validation.js` — Station validation, issue detection, self-tests
  - `sugar/equipment.js` — Equipment domain model, port definitions
  - `sugar/streams.js` — Process stream ledger, component calculations
  - `sugar/calculations.js` — All engineering property calculations (Cp, BPE, solubility, etc.)
- **Interface**: Solver takes engineering model, returns results with issues
- **Critical**: Solver must NOT depend on DOM elements
- **Verification**: Solve results identical before/after extraction

## Feature Implementation Roadmap

### Phase 0: Baseline (Completed)
- [x] Create ARCHITECTURE_AUDIT.md
- [x] Create DRAWIO_ADOPTION_MATRIX.md  
- [x] Create MIGRATION_PLAN.md
- [x] Commit baseline: `chore: establish application baseline`

### Phase 1: Modularization (P0)
Goal: Extract modules without changing behavior
- [ ] Extract `core/state.js` — State management and migrations
- [ ] Extract `core/history.js` — Undo/redo implementation
- [ ] Extract `core/persistence.js` — Save/load and recovery
- [ ] Extract `diagram/ports.js` — Port model and snapping
- [ ] Extract `diagram/nodes.js` — Node types and rendering
- [ ] Extract `diagram/connectors.js` — Connector model and properties
- [ ] Extract `diagram/routing.js` — Orthogonal routing engine
- [ ] Commit after each: `feat: extract <module>`

### Phase 2: Professional Diagram Engine (P1)
Goal: Implement missing diagramming features
- [ ] Implement multi-selection (Ctrl/Shift click, marquee box)
- [ ] Implement smart guides (center/edge alignment, equal spacing)
- [ ] Implement grid snapping with visual toggle
- [ ] Implement viewport enhancements (mouse-wheel zoom, space-drag pan already present)
- [ ] Commit features incrementally

### Phase 3: Engineering Model Separation (P2)
Goal: Isolate engineering concerns from UI/diagram
- [ ] Extract `solver/topology.js` — Network solver (must not touch DOM)
- [ ] Extract `sugar/equipment.js` — Equipment domain model
- [ ] Extract `sugar/streams.js` — Process stream calculations
- [ ] Extract `sugar/calculations.js` — All engineering property math
- [ ] Create `diagram/engineering-adapter.js` — Maps diagram ↔ engineering model
- [ ] Verify solver operates on plain engineering objects only

### Phase 4: Professional UI & Organization (P2+)
Goal: Add professional organization features
- [ ] Implement layer management system (visibility toggles)
- [ ] Implement group/ungroup system (diagram organization)
- [ ] Implement minimap and coordinate rulers
- [ ] Enhance ribbon with advanced layout tools (align/distribute)
- [ ] Commit organization features

### Phase 5: Advanced Features (P3+)
Goal: Polish and extend capabilities
- [ ] Implement SVG/PNG export
- [ ] Add engineering report generation
- [ ] Enhance template/library system
- [ ] Implement advanced routing (obstacle avoidance, stable routes)
- [ ] Add diagram validation and diagnostics

## Backward Compatibility Guarantees

### Project File Compatibility
- V5 projects → migrate to V6 → save as V6 → reopen as V6 → migrate to V7...
- **Never** silently drop fields from V5 projects
- Unknown fields in loaded V5 objects are preserved in migrated state
- Migration functions are pure and testable

### Engineering Data Integrity
- Visual changes (re-routing, moving bends) never invalidate solver unless:
  - Equipment topology changes (endpoint attached to different port)
  - Engineering property modified (temperature, pressure, DS, etc.)
- Moving equipment visually (without port reattachment) is visual-only
- Solver invalidation triggers only on:
  - `markChanged()` calls from topology/property changes
  - Not from visual-only operations (drag with snap-to-grid, bend movement)

### UI/UX Continuity
- Existing keyboard shortcuts preserved (Ctrl+Z, Ctrl+Y, Delete, Ctrl+Alt+N)
- Existing ribbon structure maintained (File/Home/Insert/Design/.../Help)
- Existing property window workflows preserved (double-click to edit)
- Existing canvas interactions preserved (drag, endpoint connect, bend/segment drag)

## Risk Mitigation

### Technical Risks
1. **State migration errors** → Mitigation: Write unit tests for `migrateV5ToV6()`, `migrateV6ToV7()`
2. **Solver regression** → Mitigation: Compare solve results before/after extraction using known test schemes
3. **Rendering differences** → Mitigation: Visual regression testing (screenshot comparison)
4. **Performance degradation** → Mitigation: Profile extraction impact, prefer pure functions

### Process Risks
1. **Scope creep** → Mitigation: Stick to extraction-first, feature-second approach
2. **Behavioral drift** → Mitigation: Automated smoke test: load scheme → render → save → reload → compare state
3. **Team coordination** → Mitigation: Feature branches per module, frequent integration

## Success Criteria

### Phase 1 (Modularization) Complete When
- All core concerns extracted to separate modules
- Application starts, loads/saves projects identically to baseline
- All existing functionality works: create node, move node, connect nodes, solve, audit
- No change in solver output for identical input schemes
- Commit: `refactor: extract core modules`

### Phase 2 (Professional Diagram) Complete When
- Multi-selection works (Ctrl/click, Shift+click, marquee box)
- Smart guides display during equipment movement
- Grid snapping functional with visual toggle
- Layers and groups stubbed out (UI present, data structures in place)
- Commit: `feat: professional diagram engine`

### Phase 3 (Engineering Separation) Complete When
- Solver operates on plain engineering objects (no DOM dependencies)
- Engineering model可替换 with mock for testing
- Diagram engine communicates via well-defined adapter
- Commit: `refactor: isolate engineering model`

### Final Sign-off
- Existing V5 projects open, solve correctly, save as V6/V7
- New projects exhibit professional diagramming behavior
- Engineering calculations unchanged (bit-for-bit identical solver output)
- All master prompt P0-P2 features implemented
- Commit: `feat: complete professional diagram editor`

## References

1. [draw.io Architecture](https://github.com/jgraph/drawio/blob/master/doc/development/drawio-architecture.pdf)
2. [draw.io mxGraph API](https://jgraph.github.io/mxgraph/docs/manual.html)
3. [Sugar Engineering Domain Knowledge] — Authoritative source (preserved)
4. [Version Migration Patterns] — Backward-compatible state evolution

---
*This migration plan enables incremental evolution of the Sugar Engineering application into a professional diagramming environment while preserving the authoritative engineering domain model and solver.*