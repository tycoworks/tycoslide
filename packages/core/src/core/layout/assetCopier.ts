// Asset Copier
// Copies fonts and images into the output directory for self-contained HTML preview.
// All HTML references assets via relative paths (fonts/, images/).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ElementNode, ImageNode } from "../model/nodes.js";
import { NODE_TYPE } from "../model/nodes.js";
import type { Background } from "../model/types.js";
import { FONT_SLOT, type Theme } from "../model/types.js";

/** Renders an HTML string to a PNG image file. Returns the absolute path to the output PNG. */
export type RasterizeHtml = (html: string) => Promise<string>;

/**
 * Copy theme fonts into outputDir/fonts/.
 * Call once before any HTML generation.
 */
export function copyFonts(theme: Theme, outputDir: string): void {
  const fontsDir = path.join(outputDir, "fonts");
  fs.mkdirSync(fontsDir, { recursive: true });
  const copied = new Set<string>();
  for (const family of theme.fonts) {
    for (const slot of Object.values(FONT_SLOT)) {
      const font = family[slot];
      if (!font || copied.has(font.path)) continue;
      copied.add(font.path);
      if (!fs.existsSync(font.path)) {
        throw new Error(
          `Font file not found: ${font.path}\nCheck that the path is correct and the font package is installed.`,
        );
      }
      fs.copyFileSync(font.path, path.join(fontsDir, path.basename(font.path)));
    }
  }
}

/**
 * Walk node trees and backgrounds, copy images to outputDir/images/.
 * When rasterize is provided, SVG images are rasterized to PNG inline
 * (PowerPoint SVG support is unreliable). The rasterized PNG replaces the
 * original SVG path on the ImageNode so downstream code sees only PNGs.
 * Returns Map<absoluteSourcePath, relativePath> for use in HTML generation.
 */
export async function copyImages(
  slides: Array<{ tree: ElementNode; background: Background }>,
  outputDir: string,
  rasterize?: RasterizeHtml,
): Promise<Map<string, string>> {
  const imagesDir = path.join(outputDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });
  const pathMap = new Map<string, string>();
  const svgCache = new Map<string, string>();

  function addImage(absPath: string): void {
    if (pathMap.has(absPath)) return;
    // HtmlRenderer PNGs are already inside outputDir — map without copying
    if (absPath.startsWith(imagesDir + path.sep) || absPath.startsWith(`${imagesDir}/`)) {
      pathMap.set(absPath, path.relative(outputDir, absPath));
      return;
    }
    const content = fs.readFileSync(absPath);
    const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);
    const ext = path.extname(absPath);
    const stem = path.basename(absPath, ext);
    const outputName = `${stem}-${hash}${ext}`;
    const dest = path.join(imagesDir, outputName);
    if (!fs.existsSync(dest)) fs.copyFileSync(absPath, dest);
    pathMap.set(absPath, `images/${outputName}`);
  }

  async function walkTree(node: ElementNode): Promise<void> {
    if (node.type === NODE_TYPE.IMAGE) {
      const img = node as ImageNode;
      const absPath = path.resolve(img.src);

      if (rasterize && path.extname(absPath).toLowerCase() === ".svg") {
        const cached = svgCache.get(absPath);
        if (cached) {
          img.src = cached;
        } else {
          const svgContent = fs.readFileSync(absPath, "utf-8");
          const html = `<div style="display:inline-block">${svgContent}</div>`;
          const pngPath = await rasterize(html);
          svgCache.set(absPath, pngPath);
          img.src = pngPath;
        }
      }

      addImage(path.resolve(img.src));
    }
    if ("children" in node && Array.isArray((node as any).children)) {
      for (const child of (node as any).children) await walkTree(child);
    }
  }

  for (const slide of slides) {
    await walkTree(slide.tree);
    if (slide.background.path) addImage(path.resolve(slide.background.path));
  }

  return pathMap;
}
