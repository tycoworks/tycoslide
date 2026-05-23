// tycoslide - Declarative slide generation library
// Main barrel export

export { LayoutValidationError } from "./core/layout/validator.js";
export type {
  ContainerNode,
  ElementNode,
  GridNode,
  ImageNode,
  Layer,
  LayoutNode,
  LineNode,
  NodeType,
  PositionedNode,
  Shadow,
  ShapeNode,
  SlideNode,
  SlideNumberNode,
  StackNode,
  Stroke,
  TableCellData,
  TableCellInput,
  TableHeaderStyle,
  TableNode,
  TextNode,
} from "./core/model/nodes.js";

export { component, isComponentNode, isLayoutNode, LAYER, NODE_TYPE } from "./core/model/nodes.js";
export type { ContainerDirective, SyntaxType } from "./core/model/syntax.js";
// Markdown utilities (for component authors)
export { extractSource, RESERVED_FRONTMATTER_KEYS, SYNTAX } from "./core/model/syntax.js";
export type {
  Background,
  DashType,
  Direction,
  Font,
  FontFamily,
  FontSlot,
  GridStyle,
  HighlightPair,
  HorizontalAlignment,
  NormalizedRun,
  ShadowType,
  ShapeName,
  SizeValue,
  Slide,
  SpacingMode,
  StrikeType,
  TemplateConfig,
  TextContent,
  TextRun,
  TextStyle,
  TextStyleName,
  Theme,
  UnderlineStyle,
  VerticalAlignment,
} from "./core/model/types.js";
export {
  Bounds,
  DASH_TYPE,
  DIRECTION,
  DIRECTION_VALUES,
  FONT_SLOT,
  GRID_STYLE,
  HALIGN,
  Insets,
  SHADOW_TYPE,
  SHAPE,
  SHAPE_VALUES,
  SIZE,
  SPACING_MODE,
  STRIKE_TYPE,
  UNDERLINE_STYLE,
  VALIGN,
} from "./core/model/types.js";
// Component system (runtime types)
export {
  type Canvas,
  type ComponentDefinition,
  type ComponentNode,
  type RenderContext,
  validateThemeFonts,
} from "./core/rendering/definitions.js";
// Core
export {
  createPresentation,
  Presentation,
  type PresentationConfig,
  type SlideLayout,
} from "./core/rendering/presentation.js";
// Font utilities
export { getFontForRun, MissingFontError } from "./utils/font.js";
// Unit utilities (used internally by PPTX renderer)
export { ptToPx } from "./utils/units.js";
