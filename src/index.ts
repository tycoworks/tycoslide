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

// Block compiler (markdown string → ComponentNode[])
export { compileBlocks } from './compiler/blockCompiler.js';

// Slide parser (multi-slide markdown file → structured document)
export { parseSlideDocument, FrontmatterParseError, type ParsedDocument, type RawSlide } from './compiler/slideParser.js';

// Layout and component definition
export { validateLayoutProps, type ParamsComponentDefinition, type InputComponentDefinition, type InferParams, type MarkdownSyntax, type MarkdownBlock, type MarkdownInvocation } from './core/registry.js';

// Schema helpers (domain-specific wrappers for layout Zod schemas)
export { schema } from './schema.js';

// Document compiler (markdown file → Presentation)
export { compileDocument, type CompileOptions } from './compiler/documentCompiler.js';

// Asset resolution
export { ASSET_PREFIX } from './compiler/assetResolver.js';
