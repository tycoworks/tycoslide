// Primitive components: image, line, shape, slideNumber

import { componentRegistry, component, type ComponentNode, type InferProps, type SchemaShape, type ExpansionContext } from '../core/registry.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { ImageNode, LineNode, ShapeNode, SlideNumberNode } from '../core/nodes.js';
import {
  Component,
  ARROW_TYPE_VALUES,
  DASH_TYPE_VALUES,
  SHAPE_VALUES,
  type ShapeName,
} from '../core/types.js';
import { LINE_TOKEN, SLIDE_NUMBER_TOKEN } from '../core/types.js';
import type { LineTokens, SlideNumberTokens } from '../core/types.js';
import { schema } from '../schema.js';
import { resolveAssetPath, ASSET_PREFIX } from '../utils/assets.js';

// ============================================
// IMAGE
// ============================================

const imageOptionsSchema = {
  alt: schema.string().optional(),
} satisfies SchemaShape;

export type ImageOptions = InferProps<typeof imageOptionsSchema>;

export type ImageProps = { body: string } & ImageOptions;

export const imageComponent = componentRegistry.define({
  name: Component.Image,
  body: schema.string(),
  params: imageOptionsSchema,

  expand: (props: { body: string } & ImageOptions, context: ExpansionContext): ImageNode => {
    let src = props.body;
    if (src.startsWith(ASSET_PREFIX)) {
      src = resolveAssetPath(src, context.assets, context.slideIndex ?? 0);
    }
    return { type: NODE_TYPE.IMAGE, src, alt: props.alt };
  },
});

export function image(src: string, options?: ImageOptions): ComponentNode {
  return component(Component.Image, { body: src, ...options });
}

// ============================================
// LINE
// ============================================

const lineSchema = {
  beginArrow: schema.enum(ARROW_TYPE_VALUES).optional(),
  endArrow: schema.enum(ARROW_TYPE_VALUES).optional(),
} satisfies SchemaShape;

export type LineProps = InferProps<typeof lineSchema>;

componentRegistry.define({
  name: Component.Line,
  params: lineSchema,
  tokens: [LINE_TOKEN.COLOR, LINE_TOKEN.WIDTH, LINE_TOKEN.DASH_TYPE],
  expand: (props: LineProps, _context: ExpansionContext, tokens: LineTokens): LineNode => ({
    type: NODE_TYPE.LINE,
    color: tokens.color,
    width: tokens.width,
    dashType: tokens.dashType,
    beginArrow: props.beginArrow,
    endArrow: props.endArrow,
  }),
});

export function line(props?: LineProps): ComponentNode {
  return component(Component.Line, props ?? {});
}

// ============================================
// SHAPE (all area shapes)
// ============================================

// Flat schema for directive attributes (:::shape{shape="roundRect" fill="FF0000" fillOpacity=80})
const shapeDirectiveSchema = {
  shape: schema.enum(SHAPE_VALUES),
  fill: schema.string().optional(),            // fill color (hex)
  fillOpacity: schema.number().optional(),     // fill opacity (0-100)
  borderColor: schema.string().optional(),
  borderWidth: schema.number().optional(),
  cornerRadius: schema.number().optional(),
} satisfies SchemaShape;

type ShapeDirectiveProps = InferProps<typeof shapeDirectiveSchema>;

// Rich nested type for DSL callers
export interface ShapeProps {
  shape: ShapeName;
  fill?: { color: string; opacity?: number };
  border?: { color?: string; width?: number; top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
  cornerRadius?: number;
}

componentRegistry.define({
  name: Component.Shape,
  params: shapeDirectiveSchema,

  expand: (props): ShapeNode => {
    const p = props as ShapeDirectiveProps & Record<string, unknown>;
    // Support both flat (directive) and nested (DSL) forms
    const rawFill = p.fill;
    const fill = rawFill
      ? (typeof rawFill === 'string'
        ? { color: rawFill, opacity: p.fillOpacity }
        : rawFill as { color: string; opacity?: number })
      : undefined;

    const rawBorder = (p as any).border;
    const border = rawBorder
      ?? (p.borderColor || p.borderWidth
        ? { color: p.borderColor, width: p.borderWidth }
        : undefined);

    return {
      type: NODE_TYPE.SHAPE,
      shape: p.shape,
      fill,
      border,
      cornerRadius: p.cornerRadius,
    };
  },
});

export function shape(props: ShapeProps): ComponentNode {
  return component(Component.Shape, props);
}

// ============================================
// SLIDE NUMBER
// ============================================

const slideNumberSchema = {} satisfies SchemaShape;

export type SlideNumberProps = InferProps<typeof slideNumberSchema>;

componentRegistry.define({
  name: Component.SlideNumber,
  params: slideNumberSchema,
  tokens: [SLIDE_NUMBER_TOKEN.STYLE, SLIDE_NUMBER_TOKEN.HALIGN],
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
