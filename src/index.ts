// Core Library Exports
// Public API for the presentation library

// Side-effect imports: register elements and components
import './elements/index.js';
import './components/card.js';
import './components/table.js';

// Main class and types
export { Presentation, type Slide, type Master } from './core/presentation.js';

// Types
export {
  // Constants
  HALIGN,
  VALIGN,
  GAP,
  DIRECTION,
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

export { NODE_TYPE } from './core/nodes.js';
export type {
  NodeType,
  ElementNode,
  SlideContent,
  ComponentNode,
  TextNode,
  ImageNode,
  LineNode,
  SlideNumberNode,
  RowNode,
  ColumnNode,
  StackNode,
  RectangleNode,
  RectangleBorder,
  PositionedNode,
} from './core/nodes.js';

// ============================================
// DSL — Pure factory functions
// ============================================

export {
  text,
  image,
  line,
  slideNumber,
  row,
  column,
  stack,
  grid,
  rectangle,
  card,
  table,
  type TextProps,
  type ImageProps,
  type LineProps,
  type RowProps,
  type ColumnProps,
  type GridProps,
  type RectangleProps,
  type CardProps,
  type TableProps,
  type TableCellContent,
} from './core/dsl.js';

// ============================================
// LAYOUT COMPUTATION & RENDERING
// ============================================

export { computeLayout, getNodeHeight, LayoutOverflowError, type LayoutOptions, checkOverflow } from './core/layout.js';
export { render } from './core/element-registry.js';

// ============================================
// COMPONENT SYSTEM
// ============================================

export {
  componentRegistry,
  component,
  isComponentNode,
  type ComponentDefinition,
  type ExpansionContext,
} from './core/component-registry.js';

// ============================================
// DIAGRAM BUILDER (declarative, no theme needed)
// ============================================

export {
  DiagramBuilder,
  diagram,
  DIAGRAM_DIRECTION,
  NODE_SHAPE,
  type DiagramProps,
  type DiagramNodeRef,
  type DiagramDirection,
  type DiagramShape,
  type SubgraphOptions,
  type EdgeOptions,
} from './components/diagram.js';

