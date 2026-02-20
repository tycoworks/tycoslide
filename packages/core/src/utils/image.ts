// Image Utilities Module
// Provides image dimension reading

import imageSizeDefault from 'image-size';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const imageSize = (imageSizeDefault as any).default || imageSizeDefault;

// ============================================
// IMAGE DIMENSIONS
// ============================================

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/** Contain-fit a rectangle with given aspect ratio inside a bounding box, centered. */
export function containFit(
  x: number, y: number, w: number, h: number, aspectRatio: number
): { x: number; y: number; w: number; h: number } {
  const [fitW, fitH] = aspectRatio > w / h
    ? [w, w / aspectRatio]
    : [h * aspectRatio, h];
  return {
    x: x + (w - fitW) / 2,
    y: y + (h - fitH) / 2,
    w: fitW,
    h: fitH,
  };
}

/** Read image dimensions from file. Returns null if image can't be read. */
export function readImageDimensions(src: string): ImageDimensions | null {
  try {
    const dimensions = imageSize(src);
    if (dimensions.width && dimensions.height) {
      return {
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: dimensions.width / dimensions.height,
      };
    }
  } catch {
    // Image can't be read (e.g., generated diagram)
  }
  return null;
}
