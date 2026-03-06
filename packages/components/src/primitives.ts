// Primitive components: line, shape, slideNumber

import {
  defineComponent, component, type ComponentNode, type SchemaShape, type ExpansionContext,
  NODE_TYPE, type LineNode, type ShapeNode, type SlideNumberNode,
  ARROW_TYPE_VALUES, SHAPE_VALUES,
  type ShapeName, type ArrowType, type DashType, type TextStyleName, type HorizontalAlignment, type VerticalAlignment,
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
  VALIGN: 'vAlign',
} as const;

export interface SlideNumberTokens {
  [SLIDE_NUMBER_TOKEN.STYLE]: TextStyleName;
  [SLIDE_NUMBER_TOKEN.COLOR]: string;
  [SLIDE_NUMBER_TOKEN.HALIGN]: HorizontalAlignment;
  [SLIDE_NUMBER_TOKEN.VALIGN]: VerticalAlignment;
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
} satisfies SchemaShape;

// Full props for DSL callers (only arrow overrides — styling comes from tokens)
export interface LineProps {
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

function expandLine(props: LineProps, _context: ExpansionContext, tokens: LineTokens): LineNode {
  return {
    type: NODE_TYPE.LINE,
    color: tokens.color,
    width: tokens.width,
    dashType: tokens.dashType,
    beginArrow: props.beginArrow,
    endArrow: props.endArrow,
  };
}

export const lineComponent = defineComponent({
  name: Component.Line,
  params: lineSchema,
  tokens: [LINE_TOKEN.COLOR, LINE_TOKEN.WIDTH, LINE_TOKEN.DASH_TYPE],
  expand: expandLine,
});

export function line(tokens: LineTokens, props?: LineProps): ComponentNode {
  return component(Component.Line, props ?? {}, tokens);
}

// ============================================
// SHAPE (all area shapes)
// ============================================

// Directive schema — author-facing props only.
// Styling props removed: authors style via variant selection.
const shapeSchema = {
  shape: schema.enum(SHAPE_VALUES),
} satisfies SchemaShape;

// Full props for DSL callers (only shape geometry — styling comes from tokens)
export interface ShapeProps {
  shape: ShapeName;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
}

function expandShape(props: ShapeProps, _context: ExpansionContext, tokens: ShapeTokens): ShapeNode {
  return {
    type: NODE_TYPE.SHAPE,
    shape: props.shape,
    fill: {
      color: tokens.fill,
      opacity: tokens.fillOpacity,
    },
    border: {
      color: tokens.borderColor,
      width: tokens.borderWidth,
      ...(props.borderTop !== undefined && { top: props.borderTop }),
      ...(props.borderRight !== undefined && { right: props.borderRight }),
      ...(props.borderBottom !== undefined && { bottom: props.borderBottom }),
      ...(props.borderLeft !== undefined && { left: props.borderLeft }),
    },
    cornerRadius: tokens.cornerRadius,
  };
}

export const shapeComponent = defineComponent({
  name: Component.Shape,
  params: shapeSchema,
  tokens: [SHAPE_TOKEN.FILL, SHAPE_TOKEN.FILL_OPACITY, SHAPE_TOKEN.BORDER_COLOR, SHAPE_TOKEN.BORDER_WIDTH, SHAPE_TOKEN.CORNER_RADIUS],
  expand: expandShape,
});

export function shape(tokens: ShapeTokens, props: ShapeProps): ComponentNode {
  return component(Component.Shape, props, tokens);
}

// ============================================
// SLIDE NUMBER
// ============================================

// Full props for DSL callers (no styling overrides — all comes from tokens)
export interface SlideNumberProps {}

function expandSlideNumber(_props: SlideNumberProps, context: ExpansionContext, tokens: SlideNumberTokens): SlideNumberNode {
  const style = tokens.style;
  return {
    type: NODE_TYPE.SLIDE_NUMBER,
    style,
    resolvedStyle: context.theme.textStyles[style],
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
  };
}

export const slideNumberComponent = defineComponent({
  name: Component.SlideNumber,
  tokens: [SLIDE_NUMBER_TOKEN.STYLE, SLIDE_NUMBER_TOKEN.COLOR, SLIDE_NUMBER_TOKEN.HALIGN, SLIDE_NUMBER_TOKEN.VALIGN],
  expand: expandSlideNumber,
});

export function slideNumber(tokens: SlideNumberTokens, props?: SlideNumberProps): ComponentNode {
  return component(Component.SlideNumber, props ?? {}, tokens);
}
