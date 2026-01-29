// Canvas - Collects drawing operations with layer tagging
// Box controls currentLayer; Presentation separates by layer at render time

import { LAYER, type Layer } from './types.js';

// ============================================
// CANVAS OBJECT TYPE CONSTANT
// ============================================

export const CANVAS_OBJECT_TYPE = {
  TEXT: 'text',
  SHAPE: 'shape',
  IMAGE: 'image',
} as const;

export type CanvasObjectType = typeof CANVAS_OBJECT_TYPE[keyof typeof CANVAS_OBJECT_TYPE];

// ============================================
// CANVAS OBJECT INTERFACE
// ============================================

export interface CanvasObject {
  type: CanvasObjectType;
  layer: Layer;
  content?: unknown;
  shapeType?: string;
  options: Record<string, unknown>;
}

// ============================================
// CANVAS CLASS
// ============================================

export class Canvas {
  private objects: CanvasObject[] = [];

  // Current layer - Box sets this before calling child drawers
  currentLayer: Layer = LAYER.SLIDE;

  // Escape hatch for direct slide access (e.g., speaker notes)
  // Set by Presentation when rendering to slide
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any = null;

  addText(content: unknown, options: Record<string, unknown>): void {
    this.objects.push({ type: CANVAS_OBJECT_TYPE.TEXT, content, options, layer: this.currentLayer });
  }

  addShape(shapeType: string, options: Record<string, unknown>): void {
    this.objects.push({ type: CANVAS_OBJECT_TYPE.SHAPE, shapeType, options, layer: this.currentLayer });
  }

  addImage(options: Record<string, unknown>): void {
    this.objects.push({ type: CANVAS_OBJECT_TYPE.IMAGE, options, layer: this.currentLayer });
  }

  getObjects(layer?: Layer): CanvasObject[] {
    if (!layer) return this.objects;
    return this.objects.filter(o => o.layer === layer);
  }
}
