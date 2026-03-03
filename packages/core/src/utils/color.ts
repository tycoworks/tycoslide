/** Convert 6-character hex color + opacity (0-1) to CSS rgba string */
export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Convert hex color + opacity percentage (0-100) to CSS background-color value.
 *  Uses rgba for partial opacity, hex for full opacity. */
export function bgColor(hex: string, opacityPercent: number): string {
  return opacityPercent < 100 ? hexToRgba(hex, opacityPercent / 100) : `#${hex}`;
}
