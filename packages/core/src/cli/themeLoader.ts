// Theme Loader
// Dynamically imports a theme package by name and extracts the expected exports.

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import type { Theme } from '../core/model/types.js';
import { componentRegistry, layoutRegistry, masterRegistry } from '../core/rendering/registry.js';
import { validateThemeFonts } from '../core/rendering/themeValidator.js';

export interface LoadedTheme {
  theme: Theme;
  assets?: Record<string, unknown>;
}

/**
 * Load a theme package by name.
 * The name is the exact npm package name (e.g., "acme_theme").
 *
 * The theme package must export:
 *   - theme: Theme (required)
 *   - components: ComponentDefinition[] (required — explicitly registered)
 *   - layouts: LayoutDefinition[] (required — explicitly registered)
 *   - assets: Record<string, unknown> (optional)
 */
export async function loadTheme(name: string): Promise<LoadedTheme> {
  const packageName = name;

  // Resolve from the user's working directory, not from tycoslide's install location
  const require = createRequire(path.join(process.cwd(), 'package.json'));

  let mod: any;
  try {
    const resolved = require.resolve(packageName);
    mod = await import(pathToFileURL(resolved).href);
  } catch (err: any) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `Could not find theme package '${packageName}'.\n` +
        `Is it installed? Try: npm install ${packageName}`,
      );
    }
    throw err;
  }

  if (!mod.theme) {
    throw new Error(
      `Theme package '${packageName}' does not export 'theme'.`,
    );
  }

  // Explicit registration from theme exports
  if (mod.components) {
    componentRegistry.register(mod.components);
  } else {
    throw new Error(
      `Theme package '${packageName}' does not export 'components'.`,
    );
  }

  if (mod.layouts) {
    layoutRegistry.register(mod.layouts);
  } else {
    throw new Error(
      `Theme package '${packageName}' does not export 'layouts'.`,
    );
  }

  if (mod.masters) {
    masterRegistry.register(mod.masters);
  } else {
    throw new Error(
      `Theme package '${packageName}' does not export 'masters'.`,
    );
  }

  validateThemeFonts(mod.theme);

  return {
    theme: mod.theme,
    assets: mod.assets,
  };
}
