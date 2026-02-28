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
  type Canvas,
  type LayoutDefinition,
  type SchemaShape,
  type ScalarShape,
  type InferProps,
  type MdastHandler,
} from './core/rendering/registry.js';

// Slide parser (multi-slide markdown file → structured document)
export { parseSlideDocument, FrontmatterParseError, type ParsedDocument, type RawSlide } from './core/markdown/slideParser.js';

// Unit utilities (for component authors that resolve theme values during expand)
export { resolveGap, inToPx } from './utils/units.js';

// Schema helpers (domain-specific wrappers for layout Zod schemas)
export { schema, type ScalarParam } from './core/model/schema.js';

// Markdown utilities (for component authors)
export { extractSource, SYNTAX } from './core/model/syntax.js';
export type { ContainerDirective, SyntaxType } from './core/model/syntax.js';
export { parseMarkdown } from './utils/parser.js';

// Document compiler (markdown file → Presentation)
export { compileDocument, validateLayout, type CompileOptions } from './core/markdown/documentCompiler.js';
