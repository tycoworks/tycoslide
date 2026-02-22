// Build Command
// Reads a markdown file, resolves its theme, compiles to slides, and writes PPTX.

import fs from 'fs';
import path from 'path';
import { compileDocument } from '../markdown/documentCompiler.js';
import { parseSlideDocument } from '../markdown/slideParser.js';
import { loadTheme } from './themeLoader.js';

export interface BuildOptions {
  output?: string;
}

export async function build(inputPath: string, options: BuildOptions): Promise<void> {
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const source = fs.readFileSync(resolved, 'utf-8');

  // Extract theme name from CLI flag or global frontmatter
  const parsed = parseSlideDocument(source);
  const themeName = typeof parsed.global.theme === 'string' ? parsed.global.theme : undefined;
  if (!themeName) {
    throw new Error(
      'No theme specified. Add `theme: <name>` to the global frontmatter in your markdown file.',
    );
  }

  // Load theme package
  const loaded = await loadTheme(themeName);

  // Compile markdown to presentation
  const pres = compileDocument(source, {
    theme: loaded.theme,
    assets: loaded.assets,
  });

  // Determine output path
  const outputPath = options.output
    ?? path.join(path.dirname(resolved), path.basename(resolved, path.extname(resolved)) + '.pptx');

  await pres.writeFile(outputPath);

  console.log(`Written: ${outputPath}`);
}

