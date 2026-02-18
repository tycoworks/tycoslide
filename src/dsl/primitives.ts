// Primitive components: image, line, shape, slideNumber

import { componentRegistry, component, type ComponentNode, type InferProps, type SchemaShape, type ExpansionContext } from '../core/registry.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { ImageNode, LineNode, ShapeNode, SlideNumberNode } from '../core/nodes.js';
import {
  Component,
  HALIGN,
  DASH_TYPE,
  TEXT_STYLE,
  ARROW_TYPE_VALUES,
  DASH_TYPE_VALUES,
  SHAPE_VALUES,
  type DashType,
  type TextStyleName,
  type HorizontalAlignment,
  type Theme,
} from '../core/types.js';
import { schema } from '../schema.js';

// ============================================
// IMAGE
// ============================================

const imageOptionsSchema = {
  alt: schema.string().optional(),
} satisfies SchemaShape;

export type ImageOptions = InferProps<typeof imageOptionsSchema>;

const imageSchema = {
  ...imageOptionsSchema,
  src: schema.string(),
} satisfies SchemaShape;

export type ImageProps = InferProps<typeof imageSchema>;

export const imageComponent = componentRegistry.define({
  name: Component.Image,
  input: schema.string(),
  expand: (props: ImageProps | string): ImageNode => {
    const resolved = typeof props === 'string' ? { src: props } : props;
    return {
      type: NODE_TYPE.IMAGE,
      src: resolved.src,
      alt: resolved.alt,
    };
  },
  directive: true,
});

export function image(src: string, options?: ImageOptions): ComponentNode {
  return component(Component.Image, { src, ...options });
}

// ============================================
// LINE
// ============================================

export interface LineTokens {
  color: string;
  width: number;
  dashType: DashType;
}

const lineSchema = {
  beginArrow: schema.enum(ARROW_TYPE_VALUES).optional(),
  endArrow: schema.enum(ARROW_TYPE_VALUES).optional(),
} satisfies SchemaShape;

export type LineProps = InferProps<typeof lineSchema>;

function lineDefaults(theme: Theme): LineTokens {
  return {
    color: theme.colors.secondary,
    width: theme.borders.width,
    dashType: DASH_TYPE.SOLID,
  };
}

componentRegistry.define({
  name: Component.Line,
  params: lineSchema,
  defaults: lineDefaults,
  expand: (props: LineProps, _context: ExpansionContext, tokens: LineTokens): LineNode => ({
    type: NODE_TYPE.LINE,
    color: tokens.color,
    width: tokens.width,
    dashType: tokens.dashType,
    beginArrow: props.beginArrow,
    endArrow: props.endArrow,
  }),
  directive: true,
});

export function line(props?: LineProps): ComponentNode {
  return component(Component.Line, props ?? {});
}

// ============================================
// SHAPE (all area shapes)
// ============================================

const shapeFillSchema = schema.object({
  color: schema.string(),
  opacity: schema.number().optional(),
});

const shapeBorderSchema = schema.object({
  color: schema.string().optional(),
  width: schema.number().optional(),
  top: schema.boolean().optional(),
  right: schema.boolean().optional(),
  bottom: schema.boolean().optional(),
  left: schema.boolean().optional(),
});

const shapeSchema = {
  shape: schema.enum(SHAPE_VALUES),
  fill: shapeFillSchema.optional(),
  border: shapeBorderSchema.optional(),
  cornerRadius: schema.number().optional(),
} satisfies SchemaShape;

export type ShapeProps = InferProps<typeof shapeSchema>;

componentRegistry.define({
  name: Component.Shape,
  params: shapeSchema,
  expand: (props: ShapeProps): ShapeNode => ({
    type: NODE_TYPE.SHAPE,
    shape: props.shape,
    fill: props.fill,
    border: props.border,
    cornerRadius: props.cornerRadius,
  }),
  directive: true,
});

export function shape(props: ShapeProps): ComponentNode {
  return component(Component.Shape, props);
}

// ============================================
// SLIDE NUMBER
// ============================================

export interface SlideNumberTokens {
  style: TextStyleName;
  color?: string;
  hAlign: HorizontalAlignment;
}

const slideNumberSchema = {} satisfies SchemaShape;

export type SlideNumberProps = InferProps<typeof slideNumberSchema>;

function slideNumberDefaults(_theme: Theme): SlideNumberTokens {
  return {
    style: TEXT_STYLE.FOOTER,
    hAlign: HALIGN.RIGHT,
  };
}

componentRegistry.define({
  name: Component.SlideNumber,
  params: slideNumberSchema,
  defaults: slideNumberDefaults,
  expand: (_props: SlideNumberProps, _context: ExpansionContext, tokens: SlideNumberTokens): SlideNumberNode => ({
    type: NODE_TYPE.SLIDE_NUMBER,
    style: tokens.style,
    color: tokens.color,
    hAlign: tokens.hAlign,
  }),
});

export function slideNumber(props?: SlideNumberProps): ComponentNode {
  return component(Component.SlideNumber, props ?? {});
}
