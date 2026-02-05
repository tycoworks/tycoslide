// Core Library Exports
// Public API for the presentation library

// Main class
export { Presentation } from './core/presentation.js';

// Types
export {
  // Constants
  HALIGN,
  VALIGN,
  GAP,
  DIRECTION,
  JUSTIFY,
  ALIGN,
  BORDER_STYLE,
  SHAPE,
  ARROW_TYPE,
  DASH_TYPE,
  FONT_WEIGHT,
  TEXT_STYLE,
  LAYER,
  SLIDE_SIZE,
  CUSTOM_LAYOUT,
  COLOR_NAME,
  NODE_STYLE,

  // Type aliases
  type ColorName,
  type NodeStyle,
  type HorizontalAlignment,
  type VerticalAlignment,
  type GapSize,
  type Direction,
  type Justify,
  type Align,
  type BorderStyle,
  type ShapeName,
  type ArrowType,
  type DashType,
  type FontWeight,
  type FontFamily,
  type Font,
  type TextStyleName,
  type Layer,
  type SlideSize,
  type CustomSlideSize,

  // Theme types
  type Theme,
  type Component,
  type Drawer,
  Bounds,
  type ColorScheme,
  type TextStyle,
  type HighlightPair,
  type HighlightScheme,

  // Master/Slide types
  type Master,
  type Slide,
} from './core/types.js';

// Layout utilities
export { sizeOf } from './components/index.js';
export { POINTS_PER_INCH } from './utils/font-utils.js';

// Text measurement abstraction
export { type TextMeasurer } from './utils/text-measurer.js';
export { FontkitTextMeasurer, fontkitMeasurer } from './utils/fontkit-measurer.js';

// Component classes and types
export {
  Text,
  Image,
  List,
  Table,
  Line,
  Card,
  type TextProps,
  type TextRun,
  type TextContent,
  type ListProps,
  type ListType,
  type TableProps,
  type TableData,
  type TableCell,
  type CellProps,
  type LineProps,
  type CardProps,
  type SlideNumberProps,
  SlideNumber,
  LIST_TYPE,
  Diagram,
  diagram,
  DIAGRAM_DIRECTION,
  NODE_SHAPE,
  type DiagramProps,
  type DiagramNode,
  type DiagramDirection,
  type NodeShape,
  type EdgeOptions,
  type SubgraphOptions,
} from './components/index.js';

// DSL — Factory functions and layout primitives
export {
  text,
  h1,
  h2,
  h3,
  h4,
  body,
  small,
  eyebrow,
  image,
  list,
  bulletList,
  numberedList,
  table,
  line,
  slideNumber,
  card,
  group,
  row,
  column,
  type LayoutOptions,
  createDSL,
  type DSL,
} from './core/dsl.js';

// Grid layout classes
export { GridRow, GridColumn } from './core/layout.js';

// ============================================
// DECLARATIVE API (v2)
// ============================================

// Declarative Presentation
export { Presentation as DeclarativePresentation, type Slide as DeclarativeSlide } from './core/presentation-v2.js';

// Node types and enum
export { NODE_TYPE, DIAGRAM_LAYOUT } from './core/nodes.js';
export type {
  NodeType,
  DiagramLayout,
  ElementNode,
  TextNode,
  ImageNode,
  LineNode,
  SlideNumberNode,
  RowNode,
  ColumnNode,
  GroupNode,
  CardNode,
  ListNode,
  TableNode,
  DiagramNode as DiagramElementNode,
  PositionedNode,
} from './core/nodes.js';

// DSL v2 - Pure factory functions (no theme/measurer needed)
export {
  text as textNode,
  h1 as h1Node,
  h2 as h2Node,
  h3 as h3Node,
  h4 as h4Node,
  body as bodyNode,
  small as smallNode,
  eyebrow as eyebrowNode,
  image as imageNode,
  line as lineNode,
  slideNumber as slideNumberNode,
  row as rowNode,
  column as columnNode,
  group as groupNode,
  card as cardNode,
  list as listNode,
  bulletList as bulletListNode,
  numberedList as numberedListNode,
  table as tableNode,
  diagram as diagramNode,
} from './core/dsl-v2.js';

// Layout computation
export { computeLayout, getNodeHeight } from './core/compute-layout.js';

// Render
export { render as renderNode } from './core/render.js';
