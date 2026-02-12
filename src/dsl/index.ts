// DSL Index
// All user-facing DSL functions — every function returns ComponentNode

// Primitives (image, line, shape, slideNumber)
export {
  image,
  line,
  shape,
  slideNumber,
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

// Text (markdown-powered)
export {
  text,
  TEXT_COMPONENT,
  MDAST,
  type TextProps,
  type TextComponentProps,
} from './text.js';

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
