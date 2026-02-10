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
