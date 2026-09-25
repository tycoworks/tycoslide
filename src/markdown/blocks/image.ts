import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Image } from "mdast";
import { parse as parseYaml } from "yaml";
import * as z from "zod";
import { type ImageFill, ImageFit, SlotType } from "../../engine/index.js";
import { MdastType } from "../mdast.js";
import { strict } from "../schema/strict.js";
import { isYamlMapping } from "../slideParser.js";
import { AcceptType, type BlockHandler } from "../types.js";

/** The fit when the title gives none: the whole picture, never cropped. */
const DEFAULT_FIT = ImageFit.Contain;

export const IMAGE: BlockHandler = {
  match: (node) => node.type === MdastType.Image,
  acceptType: AcceptType.Image,
  // `url` is a path relative to the deck. `alt` is the picture's alt text; the
  // parser flattens it to plain text, and an image written without any is "".
  // `title` carries the image's options.
  compile: async (node, ctx): Promise<ImageFill> => {
    const { url, alt, title } = node as Image;
    const options = parseImageTitle(title, ctx.region);
    const path = resolve(ctx.config.deckDir, url);
    if (!existsSync(path)) {
      throw new Error(`${ctx.region}: image "${url}" not found at ${path}`);
    }
    return { type: SlotType.Image, path, fit: options.fit ?? DEFAULT_FIT, alt: alt ?? "" };
  },
};

/**
 * Image options, carried in a markdown image's title: `![alt](src "fit: cover")`.
 * The title is a YAML mapping validated by this strict schema, so an unknown key
 * throws naming the valid ones, and adding an option is one line here.
 */
const imageOptionsSchema = strict({
  fit: z.enum(ImageFit).optional(),
});
export type ImageOptions = z.infer<typeof imageOptionsSchema>;

/** The one-option title every hint quotes, so an author sees the expected form. */
const EXAMPLE_TITLE = `"fit: ${ImageFit.Contain}"`;

/** A colon run into the next character, as in `fit:contain`: YAML reads that as one string. */
const COLON_WITHOUT_SPACE_RE = /:\S/;

/**
 * Parse an image title into its options. A missing or blank title means no
 * options. Anything else must be a YAML mapping of known options, or the build
 * fails with `where` (the slide, layout and slot) and a hint for the common
 * mistakes: a caption written in the title, a missing space after the colon, and
 * several options without flow braces.
 */
export function parseImageTitle(title: string | null | undefined, where: string): ImageOptions {
  if (!title?.trim()) return {};
  const prefix = `${where}: image title "${title}"`;

  let parsed: unknown;
  try {
    parsed = parseYaml(title);
  } catch (err) {
    // The yaml message's first line names the problem; the rest is a code frame.
    const reason = (err as Error).message.split("\n")[0].replace(/:$/, "");
    throw new Error(
      `${prefix} is not valid YAML (${reason}). Several options go in braces: "{key: value, key: value}".`,
    );
  }

  if (!isYamlMapping(parsed)) {
    const hint =
      typeof parsed === "string" && COLON_WITHOUT_SPACE_RE.test(parsed)
        ? `put a space after the colon, as in ${EXAMPLE_TITLE}`
        : `the title holds options like ${EXAMPLE_TITLE}; put a description in the alt text instead: ![${title}](…)`;
    throw new Error(`${prefix} is not a set of options: ${hint}.`);
  }

  const result = imageOptionsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${prefix}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
