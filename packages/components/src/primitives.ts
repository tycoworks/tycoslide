// Primitive components: line, shape, slideNumber

import {
  componentRegistry, component, type ComponentNode, type SchemaShape, type ExpansionContext,
  NODE_TYPE, type LineNode, type ShapeNode, type SlideNumberNode,
  ARROW_TYPE_VALUES, SHAPE_VALUES,
  type ShapeName, type ArrowType, type DashType, type TextStyleName, type HorizontalAlignment,
  schema,
} from 'tycoslide';
import { Component } from './names.js';

export const LINE_TOKEN = {
  COLOR: 'color',
  WIDTH: 'width',
  DASH_TYPE: 'dashType',
} as const;

export interface LineTokens {
  [LINE_TOKEN.COLOR]: string;
  [LINE_TOKEN.WIDTH]: number;
  [LINE_TOKEN.DASH_TYPE]: DashType;
}

export const SLIDE_NUMBER_TOKEN = {
  STYLE: 'style',
  COLOR: 'color',
  HALIGN: 'hAlign',
} as const;

export interface SlideNumberTokens {
  [SLIDE_NUMBER_TOKEN.STYLE]: TextStyleName;
  [SLIDE_NUMBER_TOKEN.COLOR]: string;
  [SLIDE_NUMBER_TOKEN.HALIGN]: HorizontalAlignment;
}

export const SHAPE_TOKEN = {
  FILL: 'fill',
  FILL_OPACITY: 'fillOpacity',
  BORDER_COLOR: 'borderColor',
  BORDER_WIDTH: 'borderWidth',
  CORNER_RADIUS: 'cornerRadius',
} as const;

export interface ShapeTokens {
  [SHAPE_TOKEN.FILL]: string;
  [SHAPE_TOKEN.FILL_OPACITY]: number;
  [SHAPE_TOKEN.BORDER_COLOR]: string;
  [SHAPE_TOKEN.BORDER_WIDTH]: number;
  [SHAPE_TOKEN.CORNER_RADIUS]: number;
}

// ============================================
// LINE
// ============================================

// Directive schema — author-facing props only.
const lineSchema = {
  beginArrow: schema.enum(ARROW_TYPE_VALUES).optional(),
  endArrow: schema.enum(ARROW_TYPE_VALUES).optional(),
  variant: schema.string().optional(),
} satisfies SchemaShape;

// Full props for DSL callers (TypeScript developers retain full access to styling)
export interface LineProps {
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
  variant?: string;
}

function expandLine(props: LineProps, _context: ExpansionContext, tokens: LineTokens): LineNode {
  return {
    type: NODE_TYPE.LINE,
    color: props.color ?? tokens.color,
    width: props.width ?? tokens.width,
    dashType: props.dashType ?? tokens.dashType,
    beginArrow: props.beginArrow,
    endArrow: props.endArrow,
  };
}

export const lineComponent = componentRegistry.define({
  name: Component.Line,
  params: lineSchema,
  tokens: [LINE_TOKEN.COLOR, LINE_TOKEN.WIDTH, LINE_TOKEN.DASH_TYPE],
  expand: expandLine,
});

export function line(props?: LineProps): ComponentNode {
  return component(Component.Line, props ?? {});
}

// ============================================
// SHAPE (all area shapes)
// ============================================

// Directive schema — author-facing props only.
// Styling props removed: authors style via variant selection.
const shapeSchema = {
  shape: schema.enum(SHAPE_VALUES),
  variant: schema.string().optional(),
} satisfies SchemaShape;

// Full props for DSL callers (TypeScript developers retain full access to styling)
export interface ShapeProps {
  shape: ShapeName;
  fill?: string;
  fillOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  cornerRadius?: number;
  variant?: string;
}

function expandShape(props: ShapeProps, _context: ExpansionContext, tokens: ShapeTokens): ShapeNode {
  return {
    type: NODE_TYPE.SHAPE,
    shape: props.shape,
    fill: {
      color: props.fill ?? tokens.fill,
      opacity: props.fillOpacity ?? tokens.fillOpacity,
    },
    border: {
      color: props.borderColor ?? tokens.borderColor,
      width: props.borderWidth ?? tokens.borderWidth,
      ...(props.borderTop !== undefined && { top: props.borderTop }),
      ...(props.borderRight !== undefined && { right: props.borderRight }),
      ...(props.borderBottom !== undefined && { bottom: props.borderBottom }),
      ...(props.borderLeft !== undefined && { left: props.borderLeft }),
    },
    cornerRadius: props.cornerRadius ?? tokens.cornerRadius,
  };
}

export const shapeComponent = componentRegistry.define({
  name: Component.Shape,
  params: shapeSchema,
  tokens: [SHAPE_TOKEN.FILL, SHAPE_TOKEN.FILL_OPACITY, SHAPE_TOKEN.BORDER_COLOR, SHAPE_TOKEN.BORDER_WIDTH, SHAPE_TOKEN.CORNER_RADIUS],
  expand: expandShape,
});

export function shape(props: ShapeProps): ComponentNode {
  return component(Component.Shape, props);
}

// ============================================
// SLIDE NUMBER
// ============================================

// Full props for DSL callers (TypeScript developers retain full access to styling)
export interface SlideNumberProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  variant?: string;
}

function expandSlideNumber(props: SlideNumberProps, _context: ExpansionContext, tokens: SlideNumberTokens): SlideNumberNode {
  return {
    type: NODE_TYPE.SLIDE_NUMBER,
    style: props.style ?? tokens.style,
    color: props.color ?? tokens.color,
    hAlign: props.hAlign ?? tokens.hAlign,
  };
}

export const slideNumberComponent = componentRegistry.define({
  name: Component.SlideNumber,
  tokens: [SLIDE_NUMBER_TOKEN.STYLE, SLIDE_NUMBER_TOKEN.COLOR, SLIDE_NUMBER_TOKEN.HALIGN],
  expand: expandSlideNumber,
});

export function slideNumber(props?: SlideNumberProps): ComponentNode {
  return component(Component.SlideNumber, props ?? {});
}
