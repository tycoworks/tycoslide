// DSL Index
// All user-facing DSL functions — every function returns ComponentNode

// Primitives (image, line, shape, slideNumber)
export {
  image,
  line,
  shape,
  slideNumber,
  imageComponent,
  IMAGE_COMPONENT,
  LINE_COMPONENT,
  SHAPE_COMPONENT,
  SLIDE_NUMBER_COMPONENT,
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
  ROW_COMPONENT,
  COLUMN_COMPONENT,
  STACK_COMPONENT,
  GRID_COMPONENT,
  type RowProps,
  type ColumnProps,
  type StackProps,
  type GridProps,
} from './containers.js';

// Table
export {
  table,
  TABLE_COMPONENT,
  type TableProps,
} from './table.js';

// Text (markdown-powered + plain)
export {
  markdown,
  text,
  markdownComponent,
  textComponent,
  MARKDOWN_COMPONENT,
  TEXT_COMPONENT,
  type TextProps,
  type TextComponentProps,
} from './text.js';

// MDAST constants (node type names for markdown AST)
export { MDAST } from '../core/mdast.js';

// Card (composition component)
export {
  card,
  cardComponent,
  CARD_COMPONENT,
  type CardProps,
} from './card.js';

// Quote (composition component)
export {
  quote,
  quoteComponent,
  QUOTE_COMPONENT,
  type QuoteProps,
} from './quote.js';

// Mermaid diagram (I/O component — mermaid-cli)
export {
  mermaid,
  mermaidComponent,
  sanitizeMermaidDefinition,
  MERMAID_COMPONENT,
  type MermaidProps,
  type MermaidComponentProps,
} from './diagram.js';
