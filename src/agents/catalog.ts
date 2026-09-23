import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as z from "zod";
import { ImageFit, strict } from "../index.js";
import { ASSETS_FILE } from "./files.js";

/**
 * One picture a theme offers deck authors. `fit` is the value an author copies
 * into the image's title, so it is already a title value.
 */
const AssetEntrySchema = strict({
  path: z.string(),
  fit: z.enum(ImageFit),
  description: z.string(),
});

// `{ category: { name: entry } }`. Both record levels are open (the names are the
// theme's own); only the entry is strict.
const AssetCatalogSchema = z.record(z.string(), z.record(z.string(), AssetEntrySchema));

export type AssetEntry = z.infer<typeof AssetEntrySchema>;
export type AssetCatalog = z.infer<typeof AssetCatalogSchema>;

/**
 * Read and validate a theme's picture catalog, `assets.json`: what a deck-writing
 * agent searches, copies pictures from, and takes each picture's fit from. It is
 * authored with the theme and required; a theme with no pictures has `{}`.
 */
export function loadAssetCatalog(themeDir: string): AssetCatalog {
  const path = join(themeDir, ASSETS_FILE);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    throw new Error(`Picture catalog not found or invalid JSON: ${path}`);
  }
  const result = AssetCatalogSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`${ASSETS_FILE}: invalid picture catalog\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
