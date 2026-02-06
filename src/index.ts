// Core Library Exports
// Public API for the presentation library

// Main class and types
export { Presentation, type Slide, type Master } from './core/presentation.js';

// Types
export {
  // Constants
  HALIGN,
  VALIGN,
  GAP,
  DIRECTION,
  JUSTIFY,
  SIZE,
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
  type SizeValue,
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

  // Text types
  type TextRun,
  type TextContent,
} from './core/types.js';

// Layout utilities
export { POINTS_PER_INCH } from './utils/font-utils.js';

// Text measurement abstraction
export { type TextMeasurer } from './utils/text-measurer.js';
export { FontkitTextMeasurer, fontkitMeasurer } from './utils/fontkit-measurer.js';

// ============================================
// NODE TYPES
// ============================================

export { NODE_TYPE, DIAGRAM_DIRECTION, NODE_SHAPE } from './core/nodes.js';
export type {
  NodeType,
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
  TableCellContent,
  DiagramNode,
  DiagramShape,
  DiagramDirection,
  DiagramNodeDef,
  DiagramSubgraphDef,
  DiagramEdgeDef,
  DiagramClassDef,
  PositionedNode,
} from './core/nodes.js';

// ============================================
// DSL — Pure factory functions
// ============================================

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
  line,
  slideNumber,
  row,
  column,
  group,
  card,
  list,
  bulletList,
  numberedList,
  table,
  type TextProps,
  type ImageProps,
  type LineProps,
  type RowProps,
  type ColumnProps,
  type GroupProps,
  type CardProps,
  type ListProps,
  type ListItemContent,
  type TableProps,
} from './core/dsl.js';

// ============================================
// LAYOUT COMPUTATION & RENDERING
// ============================================

export { computeLayout, getNodeHeight } from './core/compute-layout.js';
export { render } from './core/render.js';

// ============================================
// DIAGRAM BUILDER (declarative, no theme needed)
// ============================================

export {
  DiagramBuilder,
  diagram,
  type DiagramProps,
  type DiagramNodeRef,
  type SubgraphOptions,
  type EdgeOptions,
} from './components/diagram.js';

