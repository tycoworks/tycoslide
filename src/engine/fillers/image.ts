/**
 * Image fill — element-level picture geometry only. The media swap (pointing the
 * blip relationship at the new file) is a slide-level modifier in the ImageFiller
 * (`fillers/filler.ts`); this module just adjusts the frame for the fit mode.
 */

import { readFileSync } from "node:fs";
import { imageSize } from "image-size";
import { Attr, isPlainObject, Tag } from "../dom.js";
import { FitMode, type ImageFill, SlotType } from "../types.js";

/**
 * Adjust a picture shape's geometry for the chosen fit mode:
 *  - cover: writes `<a:srcRect>` insets (units: 1/100,000%) so the image fills
 *    the frame with the overflowing axis center-cropped.
 *  - contain: shrinks the picture's frame to the image's aspect-ratio dimensions
 *    and re-centers within the original frame bounds.
 *
 * `image.path` is assumed absolute — the compiler / caller resolves it before the
 * ImageFill reaches the engine.
 */
export function fillImage(shape: any, image: ImageFill, shapeName = ""): void {
  const dims = imageSize(new Uint8Array(readFileSync(image.path)));
  if (!dims.width || !dims.height) {
    throw new Error(`Image shape "${shapeName}": could not read image dimensions from "${image.path}".`);
  }
  const off = shape.getElementsByTagName(Tag.OFFSET)[0];
  const ext = shape.getElementsByTagName(Tag.EXTENT)[0];
  const blipFill = shape.getElementsByTagName(Tag.BLIP_FILL)[0];
  if (!off || !ext || !blipFill) {
    throw new Error(`Image shape "${shapeName}": is not a picture (missing <a:off>, <a:ext>, or <p:blipFill>).`);
  }

  const frame: Frame = {
    x: Number(off.getAttribute(Attr.X)),
    y: Number(off.getAttribute(Attr.Y)),
    w: Number(ext.getAttribute(Attr.CX)),
    h: Number(ext.getAttribute(Attr.CY)),
  };
  const geom = computeFit(frame, dims.width, dims.height, image.fit);

  if (geom.kind === "crop") {
    // cover: symmetric crop on the overflowing axis, written as srcRect insets.
    applySrcRect(shape, blipFill, geom.left, geom.top, geom.left, geom.top);
    return;
  }
  // contain: drop any inherited crop, then resize + re-center the frame itself.
  applySrcRect(shape, blipFill, 0, 0, 0, 0);
  ext.setAttribute(Attr.CX, String(geom.cx));
  ext.setAttribute(Attr.CY, String(geom.cy));
  off.setAttribute(Attr.X, String(geom.x));
  off.setAttribute(Attr.Y, String(geom.y));
}

/** A picture frame's placement + size, in EMU. */
interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Either a symmetric `<a:srcRect>` crop (cover) or a resized+re-centred frame (contain). */
type FitGeometry =
  | { kind: "crop"; left: number; top: number }
  | { kind: "frame"; x: number; y: number; cx: number; cy: number };

/**
 * Pure fit geometry — no DOM, so it is trivially unit-testable in isolation.
 * Given the picture frame (EMU) and the source image's pixel size: cover scales
 * up until both axes are covered and crops the overflow; contain scales down
 * until the whole image fits, then re-centres the shrunken frame.
 */
function computeFit(frame: Frame, imgW: number, imgH: number, fit: FitMode): FitGeometry {
  const fitX = frame.w / imgW;
  const fitY = frame.h / imgH;
  const inset = (fraction: number) => Math.round(fraction * 100000); // <a:srcRect> unit: 1/100,000%

  if (fit === FitMode.Cover) {
    const scale = Math.max(fitX, fitY);
    const shownW = imgW * scale;
    const shownH = imgH * scale;
    return {
      kind: "crop",
      left: shownW > frame.w ? inset((1 - frame.w / shownW) / 2) : 0,
      top: shownH > frame.h ? inset((1 - frame.h / shownH) / 2) : 0,
    };
  }

  const scale = Math.min(fitX, fitY);
  const cx = Math.round(imgW * scale);
  const cy = Math.round(imgH * scale);
  return {
    kind: "frame",
    x: Math.round(frame.x + (frame.w - cx) / 2),
    y: Math.round(frame.y + (frame.h - cy) / 2),
    cx,
    cy,
  };
}

/**
 * Write `<a:srcRect>` crop insets (left/top/right/bottom, in 1/100,000%),
 * creating the element right after `<a:blip>` when the picture has none yet.
 */
function applySrcRect(shape: any, blipFill: any, l: number, t: number, r: number, b: number): void {
  let srcRect = blipFill.getElementsByTagName(Tag.SRC_RECT)[0];
  if (!srcRect) {
    srcRect = shape.ownerDocument.createElement(Tag.SRC_RECT);
    const blip = blipFill.getElementsByTagName(Tag.BLIP)[0];
    if (blip?.nextSibling) blipFill.insertBefore(srcRect, blip.nextSibling);
    else blipFill.appendChild(srcRect);
  }
  srcRect.setAttribute(Attr.LEFT, String(l));
  srcRect.setAttribute(Attr.TOP, String(t));
  srcRect.setAttribute(Attr.RIGHT, String(r));
  srcRect.setAttribute(Attr.BOTTOM, String(b));
}

/** Discriminator for ImageFill values. */
export function isImageFill(v: unknown): v is ImageFill {
  return (
    isPlainObject(v) &&
    (v as { type?: unknown }).type === SlotType.Image &&
    typeof (v as { path?: unknown }).path === "string"
  );
}
