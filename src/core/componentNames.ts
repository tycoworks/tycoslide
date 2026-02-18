// Component Name Constants
// Shared constants for component names that need to cross module boundaries.
// This file is a dependency-free leaf — safe to import from any module.

// Primitives
export const IMAGE_COMPONENT = 'image' as const;
export const LINE_COMPONENT = 'line' as const;
export const SHAPE_COMPONENT = 'shape' as const;
export const SLIDE_NUMBER_COMPONENT = 'slideNumber' as const;

// Text
export const MARKDOWN_COMPONENT = 'markdown' as const;
export const TEXT_COMPONENT = 'text' as const;

// Containers
export const ROW_COMPONENT = 'row' as const;
export const COLUMN_COMPONENT = 'column' as const;
export const STACK_COMPONENT = 'stack' as const;
export const GRID_COMPONENT = 'grid' as const;

// Composition
export const CARD_COMPONENT = 'card' as const;
export const QUOTE_COMPONENT = 'quote' as const;
export const TABLE_COMPONENT = 'table' as const;
export const MERMAID_COMPONENT = 'mermaid' as const;
export const BLOCK_COMPONENT = 'block' as const;
