// TycoSlide - Declarative slide generation library
// Main barrel export

// Core
export { Presentation, type Slide, type Master } from './presentation.js';
export * from './core/types.js';
export * from './core/nodes.js';

// Component system (for custom component authors)
export * from './core/registry.js';

// DSL (all user-facing functions — every function returns ComponentNode)
export * from './dsl/index.js';
