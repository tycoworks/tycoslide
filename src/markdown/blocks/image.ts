import type { Image } from "mdast";
import type { ImageFill } from "../../engine/index.js";
import { MdastType } from "../mdast.js";
import { AcceptType, type BlockHandler } from "../types.js";

export const IMAGE: BlockHandler = {
  match: (node) => node.type === MdastType.Image,
  acceptType: AcceptType.Image,
  // `url` is the raw `$category.name` ref or deck-relative path; `resolveAssetRef`
  // validates and resolves it (fail-fast on a malformed or unknown reference).
  // `alt` is the picture's alt text; the parser flattens it to plain text, and
  // an image written without any is "".
  compile: async (node, ctx): Promise<ImageFill> => {
    const { url, alt } = node as Image;
    return ctx.resolveAssetRef(url, alt ?? "");
  },
};
