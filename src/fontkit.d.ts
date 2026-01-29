// Type declarations for fontkit
declare module 'fontkit' {
  interface GlyphRun {
    advanceWidth: number;
    glyphs: unknown[];
    positions: unknown[];
  }

  interface Font {
    unitsPerEm: number;
    ascent: number;      // Font ascender in font units
    descent: number;     // Font descender in font units (typically negative)
    lineGap: number;     // Line gap in font units
    layout(text: string): GlyphRun;
  }

  function openSync(path: string): Font;

  export { openSync, Font, GlyphRun };
}
