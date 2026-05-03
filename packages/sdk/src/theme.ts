// Multi-format theme types, definition, and resolution.
// A ThemeDefinition maps format names to ThemeFormats.
// resolveThemeFormat() flattens a ThemeDefinition + format name into a core Theme.

import type { FontFamily, TextStyle, Theme, VariantConfig } from "@tycoslide/core";
import { validateThemeFonts } from "@tycoslide/core";
import type { Template } from "./template.js";

// ── Types ──────────────────────────────────────────────────────��─────────────

/** Per-format configuration within a ThemeDefinition. */
export interface ThemeFormat {
  slide: { width: number; height: number };
  textStyles: Record<string, TextStyle>;
  layouts?: Record<string, { variants: VariantConfig }>;
  templates?: Template[];
}

/** Multi-format theme declaration. Theme packages export this. */
export interface ThemeDefinition {
  fonts: FontFamily[];
  formats: Record<string, ThemeFormat>;
}

// ── Helpers ──────────────────��───────────────────────────────────────────────

/** Convert Template[] to the layouts structure core expects. */
function templatesToLayouts(templates: Template[]): Record<string, { variants: VariantConfig }> {
  const layouts: Record<string, { variants: VariantConfig }> = {};
  for (const t of templates) {
    // Assemble the flat token bag core expects: master info under "master" key + layoutTokens
    const masterRef = { masterName: t.master.name, tokens: t.masterTokens };
    layouts[t.layout.name] = { variants: { default: { master: masterRef, ...t.layoutTokens } } };
  }
  return layouts;
}

/** Resolve layouts from a ThemeFormat, preferring explicit layouts over templates. */
function resolveLayouts(format: ThemeFormat): Record<string, { variants: VariantConfig }> {
  if (format.layouts) {
    return format.layouts;
  }
  if (format.templates) {
    return templatesToLayouts(format.templates);
  }
  return {};
}

// ── defineTheme ──────────────────────────────────────���───────────────────────

/**
 * Define a multi-format theme. Validates font configuration across all formats
 * and returns the definition.
 */
export function defineTheme(definition: ThemeDefinition): ThemeDefinition {
  const formatNames = Object.keys(definition.formats);
  if (formatNames.length === 0) {
    throw new Error("ThemeDefinition must have at least one format.");
  }

  // Validate fonts against each format
  for (const name of formatNames) {
    const format = definition.formats[name];
    validateThemeFonts({
      slide: format.slide,
      fonts: definition.fonts,
      textStyles: format.textStyles,
      layouts: resolveLayouts(format),
    });
  }

  return definition;
}

// ── resolveThemeFormat ────────────────────────���──────────────────────────────

/**
 * Resolve a ThemeDefinition to a flat Theme for a specific format.
 * Throws with available format names if the format is missing or unknown.
 */
export function resolveThemeFormat(definition: ThemeDefinition, format: string | undefined): Theme {
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
    fonts: definition.fonts,
    textStyles: themeFormat.textStyles,
    layouts: resolveLayouts(themeFormat),
  };
}
