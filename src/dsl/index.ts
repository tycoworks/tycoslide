// DSL Index
// All user-facing DSL functions — every function returns ComponentNode

// Primitives (thin wrappers over ElementNodes)
export {
  image,
  line,
  rectangle,
  slideNumber,
  type ImageProps,
  type LineProps,
  type RectangleProps,
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

// Text (markdown-powered)
export {
  text,
  TEXT_COMPONENT,
  type TextProps,
  type TextComponentProps,
} from './text/index.js';

// Card (composition component)
export {
  card,
  CARD_COMPONENT,
  type CardProps,
} from './card.js';

// Diagram (I/O component — mermaid-cli)
export {
  DiagramBuilder,
  diagram,
  DIAGRAM_COMPONENT,
  DIAGRAM_DIRECTION,
  NODE_SHAPE,
  type DiagramProps,
  type DiagramNodeRef,
  type DiagramShape,
  type DiagramDirection,
  type EdgeOptions,
  type SubgraphOptions,
} from './diagram.js';
