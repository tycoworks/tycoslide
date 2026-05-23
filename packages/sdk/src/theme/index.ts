// Multi-format theme types, definition, and resolution.
// A Theme maps format names to ThemeFormats.
// resolveThemeFormat() flattens a Theme + format name into a core Theme.

import type { TextStyle as CoreTextStyle, Theme as CoreTheme, TemplateConfig } from "@tycoslide/core";
import { validateThemeFonts } from "@tycoslide/core";
import type { FontFamily, TextStyle } from "./format.js";
import { resolveFontFamily, resolveTextStyle } from "./format.js";
import type { AssetCatalog, Template } from "./template.js";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Per-format configuration within a Theme. */
export interface ThemeFormat {
  slide: { width: number; height: number };
  textStyles: Record<string, TextStyle>;
  templates?: Template[];
}

/** Multi-format theme declaration. Theme packages export this. */
export interface Theme {
  fonts: FontFamily[];
  formats: Record<string, ThemeFormat>;
  assets: AssetCatalog;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

/** Convert Template[] to the structured TemplateConfig map core expects. */
function templatesToLayouts(templates: Template[]): Record<string, TemplateConfig> {
  const layouts: Record<string, TemplateConfig> = {};
  for (const t of templates) {
    layouts[t.layout.name] = {
      background: t.background,
      tokens: t.tokens,
    };
  }
  return layouts;
}

/** Resolve all text styles in a record from SDK TextStyle to core TextStyle. */
function resolveTextStyles(styles: Record<string, TextStyle>): Record<string, CoreTextStyle> {
  const resolved: Record<string, CoreTextStyle> = {};
  for (const [name, style] of Object.entries(styles)) {
    resolved[name] = resolveTextStyle(style);
  }
  return resolved;
}

// ── defineTheme ────────────────────────────────────────────────────────────────

/**
 * Define a multi-format theme. Validates font configuration across all formats
 * and returns the definition.
 */
export function defineTheme(definition: Theme): Theme {
  const formatNames = Object.keys(definition.formats);
  if (formatNames.length === 0) {
    throw new Error("Theme must have at least one format.");
  }

  // Validate fonts against each format (resolve to core types for validation)
  for (const name of formatNames) {
    const format = definition.formats[name];
    validateThemeFonts({
      slide: format.slide,
      fonts: definition.fonts.map(resolveFontFamily),
      textStyles: resolveTextStyles(format.textStyles),
      layouts: templatesToLayouts(format.templates ?? []),
    });
  }

  return definition;
}

// ── resolveThemeFormat ──────────────────────────────────────────────────────────

/**
 * Resolve a Theme to a flat Theme for a specific format.
 * Background is embedded in each TemplateConfig — no separate master layer.
 * Throws with available format names if the format is missing or unknown.
 */
export function resolveThemeFormat(definition: Theme, format: string | undefined): CoreTheme {
  const available = Object.keys(definition.formats);

  if (!format) {
    throw new Error(
      `No format specified. Add 'format: <name>' to the global frontmatter. Available formats in this theme: ${available.join(", ")}`,
    );
  }

  const themeFormat = definition.formats[format];
  if (!themeFormat) {
    throw new Error(`Unknown format '${format}'. Available formats: ${available.join(", ")}`);
  }

  return {
    slide: themeFormat.slide,
    fonts: definition.fonts.map(resolveFontFamily),
    textStyles: resolveTextStyles(themeFormat.textStyles),
    layouts: templatesToLayouts(themeFormat.templates ?? []),
  };
}
