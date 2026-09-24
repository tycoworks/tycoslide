/**
 * Media: copy the images a template's slide masters and layouts use (logos,
 * marks, background fills) out of the .pptx, under their original media filenames,
 * as raw material for a theme's picture catalog. Images referenced only by slides
 * are skipped: those are sample content, not the template's chrome.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { imageSize } from "image-size";
import JSZip from "jszip";
import { PRESENTATION_PART, RelTypeSuffix, readRelationships, relsPathFor, resolveTarget } from "../index.js";

const MASTER_PART = /^ppt\/slideMasters\/slideMaster(\d+)\.xml$/;
const LAYOUT_PART = /^ppt\/slideLayouts\/slideLayout(\d+)\.xml$/;
const MEDIA_DIR = "ppt/media/";
const XML_EXT = ".xml";
/** Separates the columns of a report line. */
const COLUMN = "  ";
/** Separates the parts that use an image. */
const LIST_SEPARATOR = ", ";
/** Shown for an image whose pixel size can't be read. */
const UNKNOWN_SIZE = "?";

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

/** The note a report line ends with, by outcome; a copied image needs none. */
const NOTE: Record<MediaOutcome, (image: MediaImage) => string | undefined> = {
  [MediaOutcome.Copied]: () => undefined,
  [MediaOutcome.Present]: () => "(already present, left untouched)",
  [MediaOutcome.Duplicate]: (image) => `(identical to ${image.duplicateOf}, skipped)`,
  [MediaOutcome.Missing]: () => "(missing from package)",
};

export type MediaResult = {
  /** In first-use order: masters first, then layouts, each in number order. */
  images: MediaImage[];
  /** Media files that only slides reference, and which were skipped. */
  slideOnly: number;
};

/**
 * Copy every image referenced from `templatePath`'s slide masters and layouts into
 * `outDir` (created if missing). Never overwrites: an image whose filename is
 * already there is left as it is. Fails with a plain explanation when the file is
 * missing or is not a .pptx.
 */
export async function extractMedia(templatePath: string, outDir: string): Promise<MediaResult> {
  const pkg = await openPresentation(templatePath);
  mkdirSync(outDir, { recursive: true });

  const references = await chromeImageReferences(pkg);
  const images: MediaImage[] = [];
  const firstByContent = new Map<string, string>();
  for (const [media, usedBy] of references) {
    const file = posix.basename(media);
    const entry = pkg.file(media);
    if (!entry) {
      images.push({ file, usedBy, outcome: MediaOutcome.Missing });
      continue;
    }
    const data = await entry.async("nodebuffer");
    const size = pixelSize(data);
    const digest = createHash("sha256").update(data).digest("hex");
    const duplicateOf = firstByContent.get(digest);
    if (duplicateOf) {
      images.push({ file, usedBy, outcome: MediaOutcome.Duplicate, size, duplicateOf });
      continue;
    }
    firstByContent.set(digest, file);
    const dest = join(outDir, file);
    if (existsSync(dest)) {
      images.push({ file, usedBy, outcome: MediaOutcome.Present, size });
      continue;
    }
    writeFileSync(dest, data);
    images.push({ file, usedBy, outcome: MediaOutcome.Copied, size });
  }

  const slideOnly = Object.keys(pkg.files).filter(
    (name) => name.startsWith(MEDIA_DIR) && !pkg.files[name].dir && !references.has(name),
  ).length;
  return { images, slideOnly };
}

/**
 * One line per image, then a summary, for the CLI. `outDirLabel` is the folder as
 * the user wrote it.
 */
export function describeMedia(result: MediaResult, outDirLabel: string): string[] {
  const lines = result.images.map((image) => {
    const size = image.size ? `${image.size.width}x${image.size.height}` : UNKNOWN_SIZE;
    const note = NOTE[image.outcome](image);
    return [image.file, size, image.usedBy.join(LIST_SEPARATOR), ...(note ? [note] : [])].join(COLUMN);
  });

  const count = (outcome: MediaOutcome) => result.images.filter((image) => image.outcome === outcome).length;
  const present = count(MediaOutcome.Present);
  let summary = `${count(MediaOutcome.Copied)} image(s) copied to ${outDirLabel}`;
  if (present) summary += `, ${present} already present`;
  if (result.slideOnly) summary += `; ${result.slideOnly} media file(s) referenced only by slides were skipped`;
  return [...lines, summary];
}

async function openPresentation(path: string): Promise<JSZip> {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`${path} does not exist or is not a file.`);
  }
  let pkg: JSZip;
  try {
    pkg = await JSZip.loadAsync(readFileSync(path));
  } catch {
    throw new Error(`${path} is not a .pptx file (it is not a zip archive).`);
  }
  if (!pkg.file(PRESENTATION_PART)) {
    throw new Error(`${path} is not a .pptx file (no ${PRESENTATION_PART} inside; a .docx or .xlsx perhaps?).`);
  }
  return pkg;
}

/** Master and layout parts: masters first, each set in number order. */
function chromeParts(pkg: JSZip): string[] {
  const numbered = (pattern: RegExp) =>
    Object.keys(pkg.files)
      .map((name) => ({ name, match: pattern.exec(name) }))
      .filter((part) => part.match)
      .sort((a, b) => Number(a.match?.[1]) - Number(b.match?.[1]))
      .map((part) => part.name);
  return [...numbered(MASTER_PART), ...numbered(LAYOUT_PART)];
}

/** Media part → the masters and layouts that use it, in first-use order. */
async function chromeImageReferences(pkg: JSZip): Promise<Map<string, string[]>> {
  const references = new Map<string, string[]>();
  for (const part of chromeParts(pkg)) {
    const rels = pkg.file(relsPathFor(part));
    if (!rels) continue;
    const user = posix.basename(part, XML_EXT);
    for (const rel of readRelationships(await rels.async("string"))) {
      if (rel.external || !rel.type.endsWith(RelTypeSuffix.Image)) continue;
      const media = resolveTarget(part, rel.target);
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
