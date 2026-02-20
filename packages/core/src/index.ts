// tycoslide - Declarative slide generation library
// Main barrel export

// Core
export { Presentation, type Slide, type Master } from './presentation.js';
export * from './core/types.js';
export * from './core/nodes.js';

// Component system (for custom component authors)
export * from './core/registry.js';

// DSL (all user-facing functions — every function returns ComponentNode)
export * from './dsl/index.js';

// Slide parser (multi-slide markdown file → structured document)
export { parseSlideDocument, FrontmatterParseError, type ParsedDocument, type RawSlide } from './markdown/slideParser.js';

// Schema helpers (domain-specific wrappers for layout Zod schemas)
export { schema, type ScalarParam } from './schema.js';

// Document compiler (markdown file → Presentation)
export { compileDocument, validateLayout, type CompileOptions } from './markdown/documentCompiler.js';

// Asset resolution
export { ASSET_PREFIX } from './utils/assets.js';
