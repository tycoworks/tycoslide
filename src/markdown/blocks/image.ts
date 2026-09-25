import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Image } from "mdast";
import { type ImageFill, SlotType } from "../../engine/index.js";
import { MdastType } from "../mdast.js";
import { AcceptType, type BlockHandler } from "../types.js";

export const IMAGE: BlockHandler = {
  match: (node) => node.type === MdastType.Image,
  acceptType: AcceptType.Image,
  // `url` is a path relative to the deck. `alt` is the picture's alt text; the
  // parser flattens it to plain text, and an image written without any is "".
  compile: async (node, ctx): Promise<ImageFill> => {
    const { url, alt } = node as Image;
    const path = resolve(ctx.config.deckDir, url);
    if (!existsSync(path)) {
      throw new Error(`${ctx.region}: image "${url}" not found at ${path}`);
    }
    return { type: SlotType.Image, path, alt: alt ?? "" };
  },
};
