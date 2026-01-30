// Image Component
// Renders an image with aspect ratio preservation, centered within bounds

import imageSizeDefault from 'image-size';
import { DIRECTION, ALIGN, type Component, type Drawer, type Bounds, type Theme, type AlignContext } from '../core/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sizeOfFn = (imageSizeDefault as any).default || imageSizeDefault;
export const sizeOf = sizeOfFn;

export class Image implements Component {
  readonly aspectRatio: number;

  constructor(private theme: Theme, private path: string) {
    const dimensions = sizeOf(this.path);
    this.aspectRatio = (dimensions.width ?? 1) / (dimensions.height ?? 1);
  }

  getMinimumHeight(_width: number): number {
    return this.theme.spacing.minImageHeight;
  }

  getMaximumHeight(width: number): number {
    return width / this.aspectRatio;  // Natural height at given width
  }

  getMinimumWidth(height: number): number {
    // Width needed to display at given height, preserving aspect ratio
    return height * this.aspectRatio;
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    // Calculate image dimensions maintaining aspect ratio
    const boxAspect = bounds.w / bounds.h;
    let imgW: number, imgH: number;

    if (this.aspectRatio > boxAspect) {
      // Image is wider than box - fit to width
      imgW = bounds.w;
      imgH = bounds.w / this.aspectRatio;
    } else {
      // Image is taller than box - fit to height
      imgH = bounds.h;
      imgW = bounds.h * this.aspectRatio;
    }

    // Position based on alignment context (default: center)
    let horizontalOffset = (bounds.w - imgW) / 2;
    let verticalOffset = (bounds.h - imgH) / 2;

    if (alignContext) {
      if (alignContext.direction === DIRECTION.ROW) {
        // Cross-axis is vertical
        verticalOffset = alignContext.align === ALIGN.START ? 0
                       : alignContext.align === ALIGN.END ? bounds.h - imgH
                       : (bounds.h - imgH) / 2;
      } else {
        // Cross-axis is horizontal
        horizontalOffset = alignContext.align === ALIGN.START ? 0
                         : alignContext.align === ALIGN.END ? bounds.w - imgW
                         : (bounds.w - imgW) / 2;
      }
    }

    const path = this.path;

    return (canvas) => {
      canvas.addImage({
        path,
        x: bounds.x + horizontalOffset,
        y: bounds.y + verticalOffset,
        w: imgW,
        h: imgH,
      });
    };
  }
}
