// Theme Validator
// Structural validation of theme font configuration.
// Pure computation — no I/O, no file system access.

import { FONT_FORMATS, isFontFamily } from "../../utils/font.js";
import { FONT_SLOT, type FontFamily, type Theme } from "../model/types.js";

/**
 * Walk a token object tree and invoke callback for every FontFamily value found.
 * Used to validate layout/master token font registration.
 */
function walkTokensForFonts(
  tokens: Record<string, unknown>,
  tokenPath: string,
  callback: (family: FontFamily, path: string, key: string) => void,
): void {
  for (const [key, value] of Object.entries(tokens)) {
    if (isFontFamily(value)) {
      callback(value, tokenPath, key);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      walkTokensForFonts(value as Record<string, unknown>, `${tokenPath}.${key}`, callback);
    }
  }
}

/**
 * Validate theme font configuration.
 * Checks:
 * - All font paths must be a supported format (see FONT_FORMATS in font.ts)
 * - All textStyle fontFamilies are registered in theme.fonts
 * - All layout/master token fontFamilies are registered in theme.fonts
 *
 * Called from themeLoader (CLI path) and Presentation constructor (programmatic API).
 * Pure and idempotent — safe to call multiple times.
 */
export function validateThemeFonts(theme: Theme): void {
  // Collect all registered font paths from theme.fonts
  const registeredPaths = new Set<string>();
  for (const family of theme.fonts) {
    for (const slot of Object.values(FONT_SLOT)) {
      const font = family[slot];
      if (font) {
        const ext = font.path.substring(font.path.lastIndexOf("."));
        if (!FONT_FORMATS[ext]) {
          const supported = Object.keys(FONT_FORMATS).join(", ");
          throw new Error(
            `[tycoslide] Font "${font.path}" has unsupported format "${ext}". ` + `Supported: ${supported}.`,
          );
        }
        registeredPaths.add(font.path);
      }
    }
  }

  // Validate: every textStyle fontFamily must be in theme.fonts
  for (const styleName of Object.keys(theme.textStyles)) {
    const style = theme.textStyles[styleName];
    for (const slot of Object.values(FONT_SLOT)) {
      const font = style.fontFamily[slot];
      if (font && !registeredPaths.has(font.path)) {
        throw new Error(
          `[tycoslide] Font "${style.fontFamily.name}" (${font.path}) used in textStyle "${styleName}" is not listed in theme.fonts.`,
        );
      }
    }
  }

  // Validate: layout and master tokens that contain FontFamily must be in theme.fonts
  const validateTokenFonts = (family: FontFamily, tokenPath: string, key: string) => {
    for (const slot of Object.values(FONT_SLOT)) {
      const font = family[slot];
      if (font && !registeredPaths.has(font.path)) {
        throw new Error(
          `[tycoslide] Font "${family.name}" (${font.path}) used in ${tokenPath}.${key} is not listed in theme.fonts.`,
        );
      }
    }
  };

  if (theme.layouts) {
    for (const [layoutName, layoutDef] of Object.entries(theme.layouts)) {
      for (const [variantName, tokens] of Object.entries(layoutDef.variants)) {
        walkTokensForFonts(
          tokens as Record<string, unknown>,
          `layout "${layoutName}" variant "${variantName}"`,
          validateTokenFonts,
        );
      }
    }
  }

  if (theme.masters) {
    for (const [masterName, masterDef] of Object.entries(theme.masters)) {
      for (const [variantName, tokens] of Object.entries(masterDef.variants)) {
        walkTokensForFonts(
          tokens as Record<string, unknown>,
          `master "${masterName}" variant "${variantName}"`,
          validateTokenFonts,
        );
      }
    }
  }
}
