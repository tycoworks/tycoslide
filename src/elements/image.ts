// IMAGE Element Handler
// Layout and intrinsic size logic for image nodes

import { NODE_TYPE, type ImageNode, type PositionedNode } from '../core/nodes.js';
import type { Bounds } from '../core/bounds.js';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../core/element-registry.js';
import { log } from '../utils/log.js';
import { SCREEN_DPI } from '../utils/units.js';
import imageSizeDefault from 'image-size';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const imageSize = (imageSizeDefault as any).default || imageSizeDefault;

// ============================================
// IMAGE HANDLER
// ============================================

export const imageHandler: ElementHandler<ImageNode> = {
  nodeType: NODE_TYPE.IMAGE,

  /**
   * Compute image height based on aspect ratio and scale constraints.
   * Image fills available width, height determined by aspect ratio.
   * Constrained by maxScaleFactor to prevent upscaling beyond native resolution.
   */
  getHeight(node: ImageNode, width: number, ctx: LayoutContext): number {
    const dimensions = imageSize(node.src);
    if (!dimensions.width || !dimensions.height) {
      throw new Error(`Cannot determine dimensions of image: ${node.src}`);
    }
    const pixelWidth = dimensions.width;
    const pixelHeight = dimensions.height;
    const aspectRatio = pixelWidth / pixelHeight;
    // maxScaleFactor controls upscaling limit relative to native size (at SCREEN_DPI)
    const maxHeight = (pixelHeight / SCREEN_DPI) * ctx.theme.spacing.maxScaleFactor;
    const naturalHeight = width / aspectRatio;
    const height = Math.min(naturalHeight, maxHeight);
    log.layout.height('HEIGHT image %dx%d ar=%f maxScale=%f -> %f', pixelWidth, pixelHeight, aspectRatio, ctx.theme.spacing.maxScaleFactor, height);
    return height;
  },

  /**
   * Image is fully compressible - can shrink to nothing.
   */
  getMinHeight(_node: ImageNode, _width: number, _ctx: LayoutContext): number {
    return 0;
  },

  /**
   * Compute layout for IMAGE.
   * Fits within bounds while preserving aspect ratio.
   */
  computeLayout(node: ImageNode, bounds: Bounds, ctx: LayoutContext): PositionedNode {
    const dimensions = imageSize(node.src);
    const aspectRatio = dimensions.width! / dimensions.height!;

    // Get intrinsic height (already DPI-constrained)
    const height = this.getHeight(node, bounds.w, ctx);

    // Constrain to bounds.h if bounds has a meaningful height
    const constrainedHeight = bounds.h > 0 ? Math.min(height, bounds.h) : height;

    // Calculate width from constrained height
    const widthFromHeight = constrainedHeight * aspectRatio;

    // Final dimensions: fit within both width and height constraints
    let finalWidth = Math.min(widthFromHeight, bounds.w);
    let finalHeight = finalWidth / aspectRatio;

    // If height constraint was the limiting factor, use that
    if (constrainedHeight < height && widthFromHeight <= bounds.w) {
      finalHeight = constrainedHeight;
      finalWidth = widthFromHeight;
    }

    log.layout._('  -> positioned image {x=%f y=%f w=%f h=%f} (ar=%f, bounds.h=%f)',
      bounds.x, bounds.y, finalWidth, finalHeight, aspectRatio, bounds.h);

    return {
      node,
      x: bounds.x,
      y: bounds.y,
      width: finalWidth,
      height: finalHeight,
    };
  },

  /**
   * Get intrinsic width of image at given height.
   */
  getIntrinsicWidth(node: ImageNode, height: number, _ctx: LayoutContext): number {
    const dimensions = imageSize(node.src);
    const aspectRatio = dimensions.width! / dimensions.height!;
    return height * aspectRatio;
  },
};

// ============================================
// REGISTRATION
// ============================================

// Register handler on module load
elementHandlerRegistry.register(imageHandler);
