// Canvas - Collects drawing operations with layer tagging
// Box controls currentLayer; Presentation separates by layer at render time

import { LAYER, type Layer, type ShapeName, type HorizontalAlignment, type VerticalAlignment } from './types.js';

// ============================================
// TYPED OPTION INTERFACES
// ============================================

/** Per-run formatting options for text */
export interface TextFragmentOptions {
  color?: string;
  fontFace?: string;
  fontSize?: number;
  highlight?: string;
  softBreakBefore?: boolean;
  bullet?: { type?: string; color?: string } | { color: string };
}

/** A styled text fragment for canvas rendering */
export interface TextFragment {
  text: string;
  options?: TextFragmentOptions;
}

/** Top-level text positioning + defaults */
export interface TextOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize?: number;
  fontFace?: string;
  color?: string;
  margin?: number;
  wrap?: boolean;
  lineSpacingMultiple?: number;
  align?: HorizontalAlignment;
  valign?: VerticalAlignment;
}

/** Line stroke style */
export interface LineStyle {
  color: string;
  width: number;
}

/** Fill style */
export interface FillStyle {
  color: string;
  transparency?: number;
}

/** Shape positioning + styling */
export interface ShapeOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  line?: LineStyle;
  fill?: FillStyle;
  rectRadius?: number;
}

/** Image positioning */
export interface ImageOptions {
  path: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Slide number positioning + styling (passed through to PPTXGen.js native slideNumber) */
export interface SlideNumberOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  fontFace?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  align?: HorizontalAlignment;
  valign?: VerticalAlignment;
  margin?: number;
}

// ============================================
// CANVAS OBJECT TYPE CONSTANT
// ============================================

export const CANVAS_OBJECT_TYPE = {
  TEXT: 'text',
  SHAPE: 'shape',
  IMAGE: 'image',
  SLIDE_NUMBER: 'slideNumber',
} as const;

export type CanvasObjectType = typeof CANVAS_OBJECT_TYPE[keyof typeof CANVAS_OBJECT_TYPE];

// ============================================
// CANVAS OBJECT — DISCRIMINATED UNION
// ============================================

export interface TextObject {
  type: typeof CANVAS_OBJECT_TYPE.TEXT;
  layer: Layer;
  content: TextFragment[];
  options: TextOptions;
}

export interface ShapeObject {
  type: typeof CANVAS_OBJECT_TYPE.SHAPE;
  layer: Layer;
  shapeType: ShapeName;
  options: ShapeOptions;
}

export interface ImageObject {
  type: typeof CANVAS_OBJECT_TYPE.IMAGE;
  layer: Layer;
  options: ImageOptions;
}

export interface SlideNumberObject {
  type: typeof CANVAS_OBJECT_TYPE.SLIDE_NUMBER;
  layer: Layer;
  options: SlideNumberOptions;
}

export type CanvasObject = TextObject | ShapeObject | ImageObject | SlideNumberObject;

// ============================================
// CANVAS CLASS
// ============================================

export class Canvas {
  private objects: CanvasObject[] = [];

  // Current layer - Box sets this before calling child drawers
  currentLayer: Layer = LAYER.SLIDE;

  addText(content: TextFragment[], options: TextOptions): void {
    this.objects.push({ type: CANVAS_OBJECT_TYPE.TEXT, content, options, layer: this.currentLayer });
  }

  addShape(shapeType: ShapeName, options: ShapeOptions): void {
    this.objects.push({ type: CANVAS_OBJECT_TYPE.SHAPE, shapeType, options, layer: this.currentLayer });
  }

  addImage(options: ImageOptions): void {
    this.objects.push({ type: CANVAS_OBJECT_TYPE.IMAGE, options, layer: this.currentLayer });
  }

  addSlideNumber(options: SlideNumberOptions): void {
    this.objects.push({ type: CANVAS_OBJECT_TYPE.SLIDE_NUMBER, options, layer: this.currentLayer });
  }

  getObjects(layer?: Layer): CanvasObject[] {
    if (!layer) return this.objects;
    return this.objects.filter(o => o.layer === layer);
  }
}
