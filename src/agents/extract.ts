/**
 * Extract: read a template for a theme in one pass. Writes the inventory, with the
 * images it copied, to `template.json`, and copies the master and layout images
 * into `assets/`, both in the theme folder.
 */

import { writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { ASSETS_DIR, jsonFile, TEMPLATE_FILE } from "./files.js";
import { type Inventory, readInventory } from "./inventory.js";
import { extractMedia, type MediaImage, MediaOutcome } from "./media.js";
import { Presentation } from "./pptx.js";

export type TemplateImage = MediaImage & {
  /** Where the image is in the theme folder; for a duplicate, the copy that was kept. Absent when missing. */
  path?: string;
};

/** The contents of `template.json`. */
export type TemplateFacts = Inventory & {
  images: TemplateImage[];
  /** Pictures only slides use: sample content, left in the template. */
  slideOnlyImages: number;
};

/** Read `templatePath`, write `template.json` and copy the images into `themeDir`. */
export async function extractTemplate(templatePath: string, themeDir: string): Promise<TemplateFacts> {
  const presentation = await Presentation.open(templatePath);
  const inventory = await readInventory(presentation);
  const media = await extractMedia(presentation, join(themeDir, ASSETS_DIR));
  const facts: TemplateFacts = {
    ...inventory,
    images: media.images.map((image) => {
      const kept = image.outcome === MediaOutcome.Missing ? undefined : (image.duplicateOf ?? image.file);
      return kept ? { ...image, path: posix.join(ASSETS_DIR, kept) } : image;
    }),
    slideOnlyImages: media.slideOnly,
  };
  writeFileSync(join(themeDir, TEMPLATE_FILE), jsonFile(facts));
  return facts;
}

/** What was written, in a phrase each: the template's facts, and the images. */
export function summarizeExtraction(facts: TemplateFacts): { template: string; images: string } {
  const count = (outcome: MediaOutcome) => facts.images.filter((image) => image.outcome === outcome).length;
  const template = [
    counted(facts.slides.length, "slide"),
    counted(facts.duplicates.length, "duplicate group"),
    counted(facts.embeddedFonts.length, "embedded typeface"),
  ];
  // [count, noun, what happened, report even when none]
  const images: [number, string, string, boolean][] = [
    [count(MediaOutcome.Copied), "image", "copied", true],
    [count(MediaOutcome.Present), "image", "already present", false],
    [count(MediaOutcome.Duplicate), "identical image", "skipped", false],
    [count(MediaOutcome.Missing), "image", "missing from the template", false],
    [facts.slideOnlyImages, "slide-only image", "left in the template", false],
  ];
  return {
    template: template.join(LIST_SEPARATOR),
    images: images
      .filter(([n, , , always]) => always || n > 0)
      .map(([n, noun, state]) => `${counted(n, noun)} ${state}`)
      .join(LIST_SEPARATOR),
  };
}

const LIST_SEPARATOR = ", ";

/** `1 slide`, `3 slides`. */
function counted(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}
