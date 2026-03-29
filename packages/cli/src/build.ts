// Build Command
// Reads a markdown file, resolves its theme, compiles to slides,
// and writes either PPTX or navigable HTML preview.

import fs from "node:fs";
import path from "node:path";
import { compileDocument, LayoutValidationError, MissingFontError, parseSlideDocument } from "@tycoslide/core";
import createDebug from "debug";
import { loadTheme } from "./themeLoader.js";

export interface BuildOptions {
  preview?: boolean;
  force?: boolean;
  debug?: boolean;
  notes: boolean;
  renderScale?: number;
}

export async function build(inputPath: string, options: BuildOptions): Promise<void> {
  // Enable verbose logging when --debug is set
  if (options.debug) {
    createDebug.enable("tycoslide:*");
  }

  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const source = fs.readFileSync(resolved, "utf-8");

  // Extract theme name from global frontmatter
  const parsed = parseSlideDocument(source);
  const themeName = typeof parsed.global.theme === "string" ? parsed.global.theme : undefined;
  if (!themeName) {
    throw new Error("No theme specified. Add `theme: <name>` to the global frontmatter in your markdown file.");
  }

  // Load theme package
  const loaded = await loadTheme(themeName);

  // Compile markdown to presentation
  const pres = compileDocument(source, {
    theme: loaded.theme,
    assets: loaded.assets,
  });

  const basename = path.basename(resolved, path.extname(resolved));
  const outputDir = path.resolve(`${basename}-build`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  if (options.preview) {
    // Preview mode: HTML only, skip PPTX
    try {
      const result = await pres.preview({ outputDir, renderScale: options.renderScale, force: options.force });

      if (result.validationErrors.length > 0) {
        console.warn(`${result.validationErrors.length} validation warning(s)`);
        for (const err of result.validationErrors) {
          const name = err.slideName ? ` "${err.slideName}"` : "";
          console.warn(`  Slide ${err.slideIndex + 1}${name}`);
        }
      }

      console.log(`Preview: ${path.join(outputDir, "slide-1.html")}`);
    } catch (error) {
      if (error instanceof LayoutValidationError || error instanceof MissingFontError) {
        console.error(error.message);
        process.exitCode = 1;
      } else {
        throw error;
      }
    }
  } else {
    // Build mode: PPTX + HTML
    const outputPath = path.resolve(`${basename}.pptx`);

    try {
      await pres.writeFile(outputPath, {
        force: options.force,
        outputDir,
        includeNotes: options.notes,
        renderScale: options.renderScale,
      });
      console.log(`Slides:  ${outputPath}`);
      console.log(`Preview: ${path.join(outputDir, "slide-1.html")}`);
    } catch (error) {
      if (error instanceof LayoutValidationError || error instanceof MissingFontError) {
        console.error(error.message);
        process.exitCode = 1;
      } else {
        throw error;
      }
    }
  }
}
