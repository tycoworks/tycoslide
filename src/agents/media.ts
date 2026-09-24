/**
 * Media: copy the images a template's slide masters and layouts use (logos,
 * marks, background fills) out of the .pptx, under their original media filenames,
 * as raw material for a theme's image catalog. Images referenced only by slides
 * are skipped: those are sample content, not the template's chrome.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { imageSize } from "image-size";
import { MEDIA_DIR, Part, type Presentation, RelType } from "./pptx.js";

const XML_EXT = ".xml";

/** What happened to one referenced image. */
export const MediaOutcome = {
  Copied: "copied",
  /** A file of that name was already in the output folder, and was left untouched. */
  Present: "present",
  /** Byte-identical to an image already handled under another name, so not copied twice. */
  Duplicate: "duplicate",
  /** Referenced by a relationship but absent from the package. */
  Missing: "missing",
} as const;
export type MediaOutcome = (typeof MediaOutcome)[keyof typeof MediaOutcome];

export type MediaImage = {
  /** The media filename, e.g. `image3.png`. */
  file: string;
  /** The masters and layouts that use it, e.g. `slideMaster1`, `slideLayout4`. */
  usedBy: string[];
  outcome: MediaOutcome;
  /** Pixel size, when the format is readable. */
  size?: { width: number; height: number };
  /** For a duplicate: the file it is identical to. */
  duplicateOf?: string;
};

export type MediaResult = {
  /** In first-use order: masters first, then layouts, each in number order. */
  images: MediaImage[];
  /** Media files that only slides reference, and which were skipped. */
  slideOnly: number;
};

/**
 * Copy every image referenced from the presentation's slide masters and layouts
 * into `outDir` (created if missing). Never overwrites: an image whose filename is
 * already there is left as it is.
 */
export async function copyImages(presentation: Presentation, outDir: string): Promise<MediaResult> {
  mkdirSync(outDir, { recursive: true });

  const references = await chromeImageReferences(presentation);
  const images: MediaImage[] = [];
  const firstByContent = new Map<string, string>();
  for (const [media, usedBy] of references) {
    const file = posix.basename(media);
    if (!presentation.has(media)) {
      images.push({ file, usedBy, outcome: MediaOutcome.Missing });
      continue;
    }
    const data = await presentation.bytes(media);
    const size = pixelSize(data);
    const read = { file, usedBy, ...(size && { size }) };
    const digest = createHash("sha256").update(data).digest("hex");
    const duplicateOf = firstByContent.get(digest);
    if (duplicateOf) {
      images.push({ ...read, outcome: MediaOutcome.Duplicate, duplicateOf });
      continue;
    }
    firstByContent.set(digest, file);
    const dest = join(outDir, file);
    if (existsSync(dest)) {
      images.push({ ...read, outcome: MediaOutcome.Present });
      continue;
    }
    writeFileSync(dest, data);
    images.push({ ...read, outcome: MediaOutcome.Copied });
  }

  const slideOnly = presentation.parts.filter((part) => part.startsWith(MEDIA_DIR) && !references.has(part)).length;
  return { images, slideOnly };
}

/** Media part → the masters and layouts that use it, in first-use order. */
async function chromeImageReferences(presentation: Presentation): Promise<Map<string, string[]>> {
  const references = new Map<string, string[]>();
  const chrome = [...presentation.numbered(Part.Master), ...presentation.numbered(Part.Layout)];
  for (const part of chrome) {
    const user = posix.basename(part, XML_EXT);
    for (const media of await presentation.related(part, RelType.Image)) {
      const users = references.get(media) ?? [];
      if (!users.includes(user)) users.push(user);
      references.set(media, users);
    }
  }
  return references;
}

/** Pixel size of an image, or undefined when its format isn't readable. */
function pixelSize(data: Buffer): MediaImage["size"] {
  try {
    const { width, height } = imageSize(new Uint8Array(data));
    return width && height ? { width, height } : undefined;
  } catch {
    return undefined;
  }
}
