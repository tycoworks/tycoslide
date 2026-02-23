// DSL Index
// All user-facing DSL functions — every function returns ComponentNode

// Primitives (image, line, shape, slideNumber)
export {
  image,
  line,
  shape,
  slideNumber,
  imageComponent,
  type ImageProps,
  type LineProps,
  type ShapeProps,
  type SlideNumberProps,
} from './primitives.js';

// Containers (row, column, stack, grid)
export {
  row,
  column,
  stack,
  grid,
  type RowProps,
  type ColumnProps,
  type StackProps,
  type GridProps,
} from './containers.js';

// Table
export {
  table,
  type TableProps,
} from './table.js';

// Text (label, inline-rich, structured)
export {
  label,
  text,
  prose,
  labelComponent,
  textComponent,
  proseComponent,
  HEADING_STYLE,
  type TextProps,
  type TextComponentProps,
} from './text.js';

// Content kinds (re-export from core for convenience)
export { CONTENT, type ContentType } from '../core/model/types.js';

// Syntax constants (node type names for markdown AST)
export { SYNTAX } from '../core/model/syntax.js';

// Card (composition component)
export {
  card,
  cardComponent,
  type CardProps,
} from './card.js';

// Quote (composition component)
export {
  quote,
  quoteComponent,
  type QuoteProps,
} from './quote.js';

// Mermaid diagram (I/O component — mermaid-cli)
export {
  mermaid,
  mermaidComponent,
  sanitizeMermaidDefinition,
  type MermaidProps,
  type MermaidComponentProps,
} from './mermaid.js';

