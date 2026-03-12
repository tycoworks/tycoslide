/** Strip leading '#' from hex color for pptxgenjs compatibility */
export function stripHash(color: string): string {
  return color.startsWith("#") ? color.slice(1) : color;
}

/** Convert 6-character #-prefixed hex color + opacity (0-1) to CSS rgba string */
export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Convert #-prefixed hex color + opacity percentage (0-100) to CSS background-color value.
 *  Uses rgba for partial opacity, hex for full opacity. */
export function bgColor(hex: string, opacityPercent: number): string {
  return opacityPercent < 100 ? hexToRgba(hex, opacityPercent / 100) : hex;
}
