// Theme Loader
// Dynamically imports a theme package by name and extracts the expected exports.

import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentDefinition } from "@tycoslide/core";
import type { CompileOptions, Theme } from "@tycoslide/sdk";
import { type LayoutConfig, resolveThemeFormat } from "@tycoslide/sdk";

/** Shape of the dynamic import from a theme package. */
interface ThemeModule {
  theme: Theme;
  components: ComponentDefinition<any, any, any>[];
}

/**
 * Load a theme package by name, resolving the given format to a flat Theme.
 *
 * The theme package must export:
 *   - theme: Theme (required) — may include theme.assets: AssetCatalog
 *   - components: ComponentDefinition[] (required)
 *
 * Layouts are discovered from templates across all formats.
 */
export async function loadTheme(name: string, format: string | undefined): Promise<CompileOptions> {
  const packageName = name;

  // Resolve from the user's working directory, not from tycoslide's install location
  const require = createRequire(path.join(process.cwd(), "package.json"));

  let raw: Record<string, unknown>;
  try {
    const resolved = require.resolve(packageName);
    raw = (await import(pathToFileURL(resolved).href)) as Record<string, unknown>;
  } catch (err: any) {
    if (err.code === "ERR_MODULE_NOT_FOUND" || err.code === "MODULE_NOT_FOUND") {
      throw new Error(
        `Could not find theme package '${packageName}'.\n` + `Is it installed? Try: npm install ${packageName}`,
      );
    }
    throw err;
  }

  if (!raw.theme) {
    throw new Error(`Theme package '${packageName}' does not export 'theme'.`);
  }

  if (!raw.components) {
    throw new Error(`Theme package '${packageName}' does not export 'components'.`);
  }

  const mod = raw as unknown as ThemeModule;
  const components = mod.components;

  // Discover layouts from templates across all formats
  const layouts: LayoutConfig[] = [];
  const layoutsSeen = new Set<string>();

  for (const fmt of Object.values(mod.theme.formats)) {
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
    assets: mod.theme.assets,
    components,
    layouts,
  };
}
