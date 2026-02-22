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
  type ArrowType,
  type DashType,
  type TextStyleName,
  type HorizontalAlignment,
} from '../core/types.js';
import { LINE_TOKEN, SLIDE_NUMBER_TOKEN, SHAPE_TOKEN } from '../core/types.js';
import type { LineTokens, SlideNumberTokens, ShapeTokens } from '../core/types.js';
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

// Directive schema — author-facing props only.
const lineDirectiveSchema = {
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

componentRegistry.define({
  name: Component.Line,
  params: lineDirectiveSchema,
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
const shapeDirectiveSchema = {
  shape: schema.enum(SHAPE_VALUES),
  variant: schema.string().optional(),
} satisfies SchemaShape;

type ShapeDirectiveProps = InferProps<typeof shapeDirectiveSchema>;

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

componentRegistry.define({
  name: Component.Shape,
  params: shapeDirectiveSchema,
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
const slideNumberDirectiveSchema = {} satisfies SchemaShape;

// Full props for DSL callers (TypeScript developers retain full access to styling)
export interface SlideNumberProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  variant?: string;
}

componentRegistry.define({
  name: Component.SlideNumber,
  params: slideNumberDirectiveSchema,
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
