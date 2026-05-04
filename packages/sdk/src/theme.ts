// Multi-format theme types, definition, and resolution.
// A ThemeDefinition maps format names to ThemeFormats.
// resolveThemeFormat() flattens a ThemeDefinition + format name into a core Theme.

import type { FontFamily, TemplateConfig, TextStyle, Theme } from "@tycoslide/core";
import { validateThemeFonts } from "@tycoslide/core";
import type { Template } from "./template.js";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Per-format configuration within a ThemeDefinition. */
export interface ThemeFormat {
  slide: { width: number; height: number };
  textStyles: Record<string, TextStyle>;
  templates?: Template[];
}

/** Multi-format theme declaration. Theme packages export this. */
export interface ThemeDefinition {
  fonts: FontFamily[];
  formats: Record<string, ThemeFormat>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

/** Convert Template[] to the structured TemplateConfig map core expects. */
function templatesToLayouts(templates: Template[]): Record<string, TemplateConfig> {
  const layouts: Record<string, TemplateConfig> = {};
  for (const t of templates) {
    layouts[t.layout.name] = {
      master: t.master,
      layoutTokens: t.layoutTokens,
    };
  }
  return layouts;
}

// ── defineTheme ────────────────────────────────────────────────────────────────

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
      layouts: templatesToLayouts(format.templates ?? []),
    });
  }

  return definition;
}

// ── resolveThemeFormat ──────────────────────────────────────────────────────────

/**
 * Resolve a ThemeDefinition to a flat Theme for a specific format.
 * Masters are embedded in each TemplateConfig — no separate array needed.
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
    layouts: templatesToLayouts(themeFormat.templates ?? []),
  };
}
