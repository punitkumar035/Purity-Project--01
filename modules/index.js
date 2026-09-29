/**
 * modules/index.js — Export all modular components.
 *
 * This barrel file re-exports all modules for easy imports:
 * import * as State from './modules/index.js'
 */

// Core modules
export * from '../core/state.js';
export * from '../core/history.js';
export * from '../core/persistence.js';

// Diagram modules
export * from '../diagram/ports.js';
export * from '../diagram/nodes.js';
export * from '../diagram/connectors.js';
export * from '../diagram/routing.js';

// UI modules
export * from '../ui/ribbon.js';

// Sugar Engineering model
export * as Equipment from '../sugar/equipment.js';
export * from '../sugar/streams.js';
export * from '../sugar/calculations.js';

// Solver modules
export * from '../solver/topology.js';
export * from '../solver/validation.js';
export * from '../solver/diagnostics.js';
export * from '../solver/audit.js';

// Export modules
export * from '../export/json_export.js';
export * from '../export/csv_export.js';

// Convenient namespace exports
import * as Core from '../core/state.js';
import * as Diagram from '../diagram/ports.js';
import * as Sugar from '../sugar/equipment.js';
import * as Solver from '../solver/topology.js';

export { Core, Diagram, Sugar, Solver };