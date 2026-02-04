// Image Component
// Renders an image with aspect ratio preservation, centered within bounds

import imageSizeDefault from 'image-size';
import { type Component, type Drawer, type Bounds, type Theme, type AlignContext } from '../core/types.js';
import { alignOffset } from '../core/layout.js';
import { log } from '../utils/log.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sizeOfFn = (imageSizeDefault as any).default || imageSizeDefault;
export const sizeOf = sizeOfFn;

export class Image implements Component {
  readonly aspectRatio: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;

  constructor(private theme: Theme, private path: string) {
    const dimensions = sizeOf(this.path);
    if (!dimensions.width || !dimensions.height) {
      throw new Error(`Cannot determine dimensions of image: ${this.path}`);
    }
    this.pixelWidth = dimensions.width;
    this.pixelHeight = dimensions.height;
    this.aspectRatio = this.pixelWidth / this.pixelHeight;
  }

  getHeight(width: number): number {
    const naturalHeight = width / this.aspectRatio;
    const maxFromQuality = this.pixelHeight / this.theme.spacing.minDisplayDPI;
    const h = Math.min(naturalHeight, maxFromQuality);
    log('image getHeight: w=%f natural=%f dpiCap=%f → h=%f (%dx%d ar=%f)',
      width, naturalHeight, maxFromQuality, h, this.pixelWidth, this.pixelHeight, this.aspectRatio);
    return h;
  }

  getMinHeight(_width: number): number {
    return 0;  // Images are fully compressible from the layout's perspective
  }

  getWidth(height: number): number {
    // Width needed to display at given height, preserving aspect ratio
    return height * this.aspectRatio;
  }

  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer {
    const imgW = Math.min(bounds.w, bounds.h * this.aspectRatio);
    const imgH = imgW / this.aspectRatio;

    const horizontalOffset = alignOffset(bounds.w, imgW, alignContext?.hAlign);
    const verticalOffset = alignOffset(bounds.h, imgH, alignContext?.vAlign);

    const imgPath = this.path;

    return (canvas) => {
      canvas.addImage({
        path: imgPath,
        x: bounds.x + horizontalOffset,
        y: bounds.y + verticalOffset,
        w: imgW,
        h: imgH,
      });
    };
  }
}
