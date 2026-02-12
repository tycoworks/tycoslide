// Primitive components: image, line, shape, slideNumber

import { componentRegistry, component, type ComponentNode } from '../core/registry.js';
import { NODE_TYPE } from '../core/nodes.js';
import type { ImageNode, LineNode, ShapeNode, ShapeBorder, SlideNumberNode } from '../core/nodes.js';
import type { TextStyleName, HorizontalAlignment, ArrowType, DashType, ShapeName } from '../core/types.js';
import { HALIGN, SHAPE } from '../core/types.js';

// ============================================
// IMAGE
// ============================================

export const IMAGE_COMPONENT = 'image' as const;

export interface ImageOptions {
  alt?: string;
}

export interface ImageProps extends ImageOptions {
  src: string;
}

componentRegistry.register({ name: IMAGE_COMPONENT, expand: (props: ImageProps): ImageNode => ({
  type: NODE_TYPE.IMAGE,
  src: props.src,
  alt: props.alt,
})});

export function image(src: string, options?: ImageOptions): ComponentNode {
  return component(IMAGE_COMPONENT, { src, ...options });
}

// ============================================
// LINE
// ============================================

export const LINE_COMPONENT = 'line' as const;

export interface LineProps {
  color?: string;
  width?: number;
  dashType?: DashType;
  beginArrow?: ArrowType;
  endArrow?: ArrowType;
}

componentRegistry.register({ name: LINE_COMPONENT, expand: (props: LineProps): LineNode => ({
  type: NODE_TYPE.LINE,
  color: props.color,
  width: props.width,
  dashType: props.dashType,
  beginArrow: props.beginArrow,
  endArrow: props.endArrow,
})});

export function line(props?: LineProps): ComponentNode {
  return component(LINE_COMPONENT, props ?? {});
}

// ============================================
// SHAPE (all area shapes)
// ============================================

export const SHAPE_COMPONENT = 'shape' as const;

export interface ShapeProps {
  shape: ShapeName;
  fill?: { color: string; opacity?: number };
  border?: ShapeBorder;
  cornerRadius?: number;
}

componentRegistry.register({ name: SHAPE_COMPONENT, expand: (props: ShapeProps): ShapeNode => ({
  type: NODE_TYPE.SHAPE,
  shape: props.shape,
  fill: props.fill,
  border: props.border,
  cornerRadius: props.cornerRadius,
})});

export function shape(props: ShapeProps): ComponentNode {
  return component(SHAPE_COMPONENT, props);
}

// ============================================
// SLIDE NUMBER
// ============================================

export const SLIDE_NUMBER_COMPONENT = 'slideNumber' as const;

export interface SlideNumberProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
}

componentRegistry.register({ name: SLIDE_NUMBER_COMPONENT, expand: (props: SlideNumberProps): SlideNumberNode => ({
  type: NODE_TYPE.SLIDE_NUMBER,
  style: props.style,
  color: props.color,
  hAlign: props.hAlign ?? HALIGN.RIGHT,
})});

export function slideNumber(props?: SlideNumberProps): ComponentNode {
  return component(SLIDE_NUMBER_COMPONENT, {
    style: props?.style,
    color: props?.color,
    hAlign: props?.hAlign,
  });
}
