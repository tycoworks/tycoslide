// TycoSlide - Declarative slide generation library
// Main barrel export

// Core
export { Presentation, type Slide, type Master } from './presentation.js';
export * from './core/types.js';
export * from './core/dsl.js';
export * from './core/nodes.js';

// Components (side-effect: registers with component registry)
export * from './components/index.js';
