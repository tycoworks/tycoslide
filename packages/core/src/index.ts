// tycoslide - Declarative slide generation library
// Main barrel export

// Core
export { Presentation, type WriteResult } from './core/rendering/presentation.js';
export { LayoutValidationError, type SlideValidationResult, type ValidationResult } from './core/layout/validator.js';
export * from './core/model/types.js';
export * from './core/model/nodes.js';

// Component system (for custom component authors)
export {
  componentRegistry,
  layoutRegistry,
  component,
  isComponentNode,
  type ComponentNode,
  type ComponentDefinition,
  type ScalarComponentDefinition,
  type ExpansionContext,
  type LayoutDefinition,
  type SchemaShape,
  type ScalarShape,
  type InferProps,
} from './core/rendering/registry.js';

// Slide parser (multi-slide markdown file → structured document)
export { parseSlideDocument, FrontmatterParseError, type ParsedDocument, type RawSlide } from './core/markdown/slideParser.js';

// Schema helpers (domain-specific wrappers for layout Zod schemas)
export { schema, type ScalarParam } from './core/model/schema.js';

// Markdown toolkit (for component authors that parse markdown internally)
export { markdown } from './core/markdown/markdown.js';
export { SYNTAX } from './core/model/syntax.js';
export type { ContainerDirective } from './core/model/syntax.js';

// Document compiler (markdown file → Presentation)
export { compileDocument, validateLayout, type CompileOptions } from './core/markdown/documentCompiler.js';

// Asset resolution
export { resolveAssetPath, ASSET_PREFIX } from './utils/assets.js';
