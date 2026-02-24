// Primitive components: line, shape, slideNumber

import {
  componentRegistry, component, type ComponentNode, type InferProps, type SchemaShape, type ExpansionContext,
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

export const lineComponent = componentRegistry.define({
  name: Component.Line,
  params: lineSchema,
  tokens: [LINE_TOKEN.COLOR, LINE_TOKEN.WIDTH, LINE_TOKEN.DASH_TYPE],
  expand: (props, _context: ExpansionContext, tokens: LineTokens): LineNode => {
    const p = props as LineProps;
    return {
      type: NODE_TYPE.LINE,
      color: p.color ?? tokens.color,
      width: p.width ?? tokens.width,
      dashType: p.dashType ?? tokens.dashType,
      beginArrow: p.beginArrow,
      endArrow: p.endArrow,
    };
  },
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

type ShapeDirectiveProps = InferProps<typeof shapeSchema>;

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

export const shapeComponent = componentRegistry.define({
  name: Component.Shape,
  params: shapeSchema,
  tokens: [SHAPE_TOKEN.FILL, SHAPE_TOKEN.FILL_OPACITY, SHAPE_TOKEN.BORDER_COLOR, SHAPE_TOKEN.BORDER_WIDTH, SHAPE_TOKEN.CORNER_RADIUS],

  expand: (props, _context: ExpansionContext, tokens: ShapeTokens): ShapeNode => {
    const p = props as ShapeProps;
    return {
      type: NODE_TYPE.SHAPE,
      shape: p.shape,
      fill: {
        color: p.fill ?? tokens.fill,
        opacity: p.fillOpacity ?? tokens.fillOpacity,
      },
      border: {
        color: p.borderColor ?? tokens.borderColor,
        width: p.borderWidth ?? tokens.borderWidth,
        ...(p.borderTop !== undefined && { top: p.borderTop }),
        ...(p.borderRight !== undefined && { right: p.borderRight }),
        ...(p.borderBottom !== undefined && { bottom: p.borderBottom }),
        ...(p.borderLeft !== undefined && { left: p.borderLeft }),
      },
      cornerRadius: p.cornerRadius ?? tokens.cornerRadius,
    };
  },
});

export function shape(props: ShapeProps): ComponentNode {
  return component(Component.Shape, props);
}

// ============================================
// SLIDE NUMBER
// ============================================

// Directive schema — no author-facing props for slide number.
const slideNumberSchema = {} satisfies SchemaShape;

// Full props for DSL callers (TypeScript developers retain full access to styling)
export interface SlideNumberProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  variant?: string;
}

export const slideNumberComponent = componentRegistry.define({
  name: Component.SlideNumber,
  params: slideNumberSchema,
  tokens: [SLIDE_NUMBER_TOKEN.STYLE, SLIDE_NUMBER_TOKEN.COLOR, SLIDE_NUMBER_TOKEN.HALIGN],
  expand: (props, _context: ExpansionContext, tokens: SlideNumberTokens): SlideNumberNode => {
    const p = props as SlideNumberProps;
    return {
      type: NODE_TYPE.SLIDE_NUMBER,
      style: p.style ?? tokens.style,
      color: p.color ?? tokens.color,
      hAlign: p.hAlign ?? tokens.hAlign,
    };
  },
});

export function slideNumber(props?: SlideNumberProps): ComponentNode {
  return component(Component.SlideNumber, props ?? {});
}
