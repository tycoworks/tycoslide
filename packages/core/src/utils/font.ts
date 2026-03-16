// Font Utilities Module
// Provides text normalization and font family helpers

import { type ElementNode, NODE_TYPE } from "../core/model/nodes.js";
import {
  FONT_SLOT,
  type Font,
  type FontFamily,
  type FontSlot,
  type NormalizedRun,
  type TextContent,
  type TextRun,
} from "../core/model/types.js";

/**
 * Supported font formats for @font-face CSS and theme validation.
 * Used by themeValidator (format check) and layoutHtml (CSS generation).
 */
export const FONT_FORMATS: Record<string, { mime: string; format: string }> = {
  ".woff2": { mime: "font/woff2", format: "woff2" },
  ".woff": { mime: "font/woff", format: "woff" },
  ".ttf": { mime: "font/ttf", format: "truetype" },
  ".otf": { mime: "font/opentype", format: "opentype" },
};

/**
 * Get the Font for a run's bold/italic flags from a FontFamily.
 * Falls back to regular when optional slots are missing.
 */
export function getFontForRun(fontFamily: FontFamily, bold?: boolean, italic?: boolean): Font {
  if (bold && italic) return fontFamily.boldItalic ?? fontFamily.bold ?? fontFamily.regular;
  if (bold) return fontFamily.bold ?? fontFamily.regular;
  if (italic) return fontFamily.italic ?? fontFamily.regular;
  return fontFamily.regular;
}

/**
 * Resolve the PPTX fontFace for a run's bold/italic state.
 * Uses Font.name when the font belongs to a different typeface
 * than its parent FontFamily (e.g., interLight's bold is "Inter").
 * Falls back to family.name when font.name is not set.
 */
export function resolveFontFace(family: FontFamily, bold?: boolean, italic?: boolean): string {
  const font = getFontForRun(family, bold, italic);
  return font.name ?? family.name;
}

/**
 * Check if a run's bold/italic flags require a FontFamily slot that doesn't exist.
 * Returns the violation (font name + missing slot) or null if OK.
 */
export function checkFontVariant(
  fontFamily: FontFamily,
  bold?: boolean,
  italic?: boolean,
): { fontName: string; slot: FontSlot } | null {
  if (bold && italic && !fontFamily.boldItalic) {
    return { fontName: fontFamily.name, slot: FONT_SLOT.BOLD_ITALIC };
  }
  if (bold && !fontFamily.bold) {
    return { fontName: fontFamily.name, slot: FONT_SLOT.BOLD };
  }
  if (italic && !fontFamily.italic) {
    return { fontName: fontFamily.name, slot: FONT_SLOT.ITALIC };
  }
  return null;
}

/**
 * Duck-type check: is this value a FontFamily object?
 * Checks for required `name` string and `regular` property with `path` string.
 */
export function isFontFamily(value: unknown): value is FontFamily {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as any).name === "string" &&
    "regular" in value &&
    typeof (value as any).regular === "object" &&
    (value as any).regular !== null &&
    typeof (value as any).regular.path === "string"
  );
}

// ============================================
// TEXT STYLE RESOLUTION
// ============================================

/**
 * Paragraph gap ratio: spacing between paragraphs as a multiple of fontSize.
 *
 * CSS default: <p> elements have margin-top/bottom of 1em.
 * 1em === computed font-size (CSS Values Level 4, §5.1.1).
 * Therefore paragraphGap = fontSize × 1.0.
 *
 * Unlike line-height: normal (which varies per font's OS/2 metrics and must
 * be measured in the browser), this is a CSS specification constant — not a
 * font metric. We express it as a named function for API consistency with
 * fontNormalRatios and to document the assumption in one place.
 */
export function getParagraphGapRatio(): number {
  return 1.0;
}

// ============================================
// RICH TEXT HELPERS
// ============================================

/**
 * Normalize TextContent to consistent NormalizedRun array.
 * Handles both string and TextRun[] inputs.
 */
export function normalizeContent(content: TextContent): NormalizedRun[] {
  if (typeof content === "string") {
    return [{ text: content }];
  }
  return content.map((run: TextRun) => {
    if (typeof run === "string") {
      return { text: run };
    }
    return run;
  });
}

// ============================================
// MISSING FONT VALIDATION
// ============================================

export interface FontVariantViolation {
  fontName: string;
  slot: FontSlot;
}

/**
 * Walk a rendered ElementNode tree and check for bold/italic runs
 * on fonts that lack the corresponding variant slot.
 * Returns deduplicated violations (unique by fontName + slot).
 */
export function validateFontVariants(tree: ElementNode): FontVariantViolation[] {
  const seen = new Set<string>();
  const violations: FontVariantViolation[] = [];

  function addViolation(v: { fontName: string; slot: FontSlot }) {
    const key = `${v.fontName}:${v.slot}`;
    if (!seen.has(key)) {
      seen.add(key);
      violations.push({ fontName: v.fontName, slot: v.slot });
    }
  }

  function checkRuns(content: TextContent, fontFamily: FontFamily): void {
    for (const run of normalizeContent(content)) {
      if (run.bold || run.italic) {
        const v = checkFontVariant(fontFamily, run.bold, run.italic);
        if (v) addViolation(v);
      }
    }
  }

  function walk(node: ElementNode): void {
    if (node.type === NODE_TYPE.TEXT) {
      checkRuns(node.content, node.resolvedStyle.fontFamily);
    } else if (node.type === NODE_TYPE.TABLE) {
      for (const row of node.rows) {
        for (const cell of row) {
          checkRuns(cell.content, cell.resolvedStyle.fontFamily);
        }
      }
    } else if (node.type === NODE_TYPE.CONTAINER || node.type === NODE_TYPE.STACK) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(tree);
  return violations;
}

/**
 * Format missing font violations into a human-readable error message.
 */
export function formatMissingFontErrors(violations: FontVariantViolation[]): string {
  const details = violations.map((v) => `  "${v.fontName}" has no ${v.slot} variant.`);
  return `Missing font errors:\n\n${details.join("\n")}`;
}

/**
 * Error thrown when missing font validation fails.
 * Analogous to LayoutValidationError for layout errors.
 */
export class MissingFontError extends Error {
  readonly violations: FontVariantViolation[];

  constructor(violations: FontVariantViolation[]) {
    super(formatMissingFontErrors(violations));
    this.name = "MissingFontError";
    this.violations = violations;
  }
}
