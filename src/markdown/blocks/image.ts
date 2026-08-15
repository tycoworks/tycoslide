import type { Image } from "mdast";
import type { ImageFill } from "../../engine/index.js";
import { MdastType } from "../mdast.js";
import { AcceptType, type BlockHandler } from "../types.js";

export const IMAGE: BlockHandler = {
  match: (node) => node.type === MdastType.Image,
  acceptType: AcceptType.Image,
  // `node.url` is the raw `$category.name` ref; `resolveAssetRef` validates and
  // resolves it (fail-fast on a malformed or unknown reference). `alt` is ignored.
  compile: async (node, ctx): Promise<ImageFill> => ctx.resolveAssetRef((node as Image).url),
};
