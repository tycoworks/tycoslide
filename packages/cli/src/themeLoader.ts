// Theme Loader
// Dynamically imports a theme package by name and extracts the expected exports.

import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentDefinition, LayoutDefinition, Theme } from "@tycoslide/core";
import { resolveThemeFormat } from "@tycoslide/sdk";

export interface LoadedTheme {
  theme: Theme;
  assets?: Record<string, unknown>;
  components: ComponentDefinition<any, any, any>[];
  layouts: LayoutDefinition[];
}

/**
 * Load a theme package by name, resolving the given format to a flat Theme.
 *
 * The theme package must export:
 *   - theme: ThemeDefinition (required)
 *   - components: ComponentDefinition[] (required)
 *   - assets: Record<string, unknown> (optional)
 *
 * Layouts are discovered from templates across all formats.
 */
export async function loadTheme(name: string, format: string | undefined): Promise<LoadedTheme> {
  const packageName = name;

  // Resolve from the user's working directory, not from tycoslide's install location
  const require = createRequire(path.join(process.cwd(), "package.json"));

  let mod: any;
  try {
    const resolved = require.resolve(packageName);
    mod = await import(pathToFileURL(resolved).href);
  } catch (err: any) {
    if (err.code === "ERR_MODULE_NOT_FOUND" || err.code === "MODULE_NOT_FOUND") {
      throw new Error(
        `Could not find theme package '${packageName}'.\n` + `Is it installed? Try: npm install ${packageName}`,
      );
    }
    throw err;
  }

  if (!mod.theme) {
    throw new Error(`Theme package '${packageName}' does not export 'theme'.`);
  }

  if (!mod.components) {
    throw new Error(`Theme package '${packageName}' does not export 'components'.`);
  }

  const components: ComponentDefinition<any, any, any>[] = mod.components;

  // Discover layouts from templates across all formats
  const layouts: LayoutDefinition[] = [];
  const layoutsSeen = new Set<string>();

  for (const fmt of Object.values(mod.theme.formats) as any[]) {
    if (fmt.templates) {
      for (const t of fmt.templates) {
        if (t.layout && !layoutsSeen.has(t.layout.name)) {
          layoutsSeen.add(t.layout.name);
          layouts.push(t.layout);
        }
      }
    }
  }

  if (layoutsSeen.size === 0) {
    throw new Error(`Theme package '${packageName}' has no layouts in its templates.`);
  }

  // Resolve format to flat Theme (background embedded in each TemplateConfig)
  const theme = resolveThemeFormat(mod.theme, format);

  return {
    theme,
    assets: mod.assets,
    components,
    layouts,
  };
}
