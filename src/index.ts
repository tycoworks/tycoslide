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

// Compiler (block-level markdown → ComponentNode[])
export { compileBlocks } from './compiler/blockCompiler.js';

// Slide parser (multi-slide markdown file → structured document)
export { parseSlideDocument, FrontmatterParseError, type ParsedDocument, type RawSlide } from './compiler/slideParser.js';

// Layout validation
export { validateLayoutProps } from './core/registry.js';
