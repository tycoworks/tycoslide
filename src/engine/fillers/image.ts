/**
 * Image fill — element-level picture geometry only. The media swap (pointing the
 * blip relationship at the new file) is a slide-level modifier in the ImageFiller
 * (`fillers/filler.ts`); this module resolves the frame geometry from the image's
 * `ImageFit` (contain/cover/scale-down) and the source's true pixel size.
 */

import { readFileSync } from "node:fs";
import { imageSize } from "image-size";
import { Attr, isPlainObject, Tag } from "../dom.js";
import { type ImageFill, ImageFit, SlotType } from "../types.js";

/** A picture frame's placement + size, in EMU. */
interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The two ways a picture is placed: crop the source (`<a:srcRect>`) or resize the frame. */
const Placement = { Crop: "crop", Fit: "fit" } as const;

/** Either a symmetric `<a:srcRect>` crop (fill/cover) or a resized+re-centred frame (fit/contain). */
type FitGeometry =
  | { placement: typeof Placement.Crop; left: number; top: number }
  | { placement: typeof Placement.Fit; x: number; y: number; cx: number; cy: number };

export type GeometryResult = { geometry: FitGeometry; warnings: string[] };

const EMU_PER_INCH = 914400;
/** PPTX's reference pixel density: one source px maps to one output px at this DPI. */
const PX_PER_INCH = 96;
/** EMU that one source pixel occupies at native (1:1) size — 9525. */
const NATIVE_EMU_PER_PX = EMU_PER_INCH / PX_PER_INCH;
/** `<a:srcRect>` insets are fixed-point fractions of the picture where this = 100%. */
const SRC_RECT_FULL = 100000;
/** Warn once the cropped-away or empty area exceeds this fraction of the frame. */
const SEVERE_MISMATCH_FRACTION = 0.5;
/** Warn once the image renders below this fraction of its native pixel size. */
const MIN_SCALE = 0.2;

/**
 * Size a picture shape from its `ImageFit` (via `computeGeometry`): either write
 * `<a:srcRect>` insets to fill-and-crop, or shrink the frame to the image's
 * aspect ratio and re-centre (fit/letterbox). Advisory warnings from the
 * geometry pass go to `console.warn`.
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
  const { geometry, warnings } = computeGeometry(frame, dims.width, dims.height, image.fit);
  for (const w of warnings) console.warn(`Image "${shapeName}": ${w}`);

  if (geometry.placement === Placement.Crop) {
    // fill: symmetric crop on the overflowing axis, written as srcRect insets.
    applySrcRect(shape, blipFill, geometry.left, geometry.top, geometry.left, geometry.top);
    return;
  }
  // fit: drop any inherited crop, then resize + re-center the frame itself.
  applySrcRect(shape, blipFill, 0, 0, 0, 0);
  ext.setAttribute(Attr.CX, String(geometry.cx));
  ext.setAttribute(Attr.CY, String(geometry.cy));
  off.setAttribute(Attr.X, String(geometry.x));
  off.setAttribute(Attr.Y, String(geometry.y));
}

/**
 * Pure fit geometry — no DOM, so it is trivially unit-testable in isolation.
 * `fit` picks the strategy: `cover` scales to the larger axis ratio and
 * center-crops the overflow; `contain` scales to the smaller ratio and
 * letterboxes; `scale-down` is `contain` capped at native size (never enlarge →
 * the image sits at native size, centred). Emits advisory warnings for scaling
 * far from native and for a severe aspect mismatch; the caller decides how to
 * surface them.
 */
export function computeGeometry(frame: Frame, imgW: number, imgH: number, fit: ImageFit): GeometryResult {
  const fitX = frame.w / imgW;
  const fitY = frame.h / imgH;
  const allowCrop = fit === ImageFit.Cover;
  let scale = allowCrop ? Math.max(fitX, fitY) : Math.min(fitX, fitY);
  if (fit === ImageFit.ScaleDown) scale = Math.min(scale, NATIVE_EMU_PER_PX); // never enlarge past native

  const warnings: string[] = [];
  const scaleRatio = scale / NATIVE_EMU_PER_PX; // rendered size vs the image's native pixels
  if (scaleRatio > 1) {
    warnings.push(`enlarged to ${Math.round(scaleRatio * 100)}% of native — will look soft; supply a larger image`);
  } else if (scaleRatio < MIN_SCALE) {
    warnings.push(`shrunk to ${Math.round(scaleRatio * 100)}% of native — the slot is far smaller than the image`);
  }

  const shownW = imgW * scale;
  const shownH = imgH * scale;
  const inset = (fraction: number) => Math.round(fraction * SRC_RECT_FULL);

  if (allowCrop && (shownW > frame.w || shownH > frame.h)) {
    const cropped = 1 - (frame.w * frame.h) / (shownW * shownH);
    if (cropped > SEVERE_MISMATCH_FRACTION) {
      warnings.push(`fills the frame by cropping ${Math.round(cropped * 100)}% of the image (aspect mismatch)`);
    }
    return {
      geometry: {
        placement: Placement.Crop,
        left: shownW > frame.w ? inset((1 - frame.w / shownW) / 2) : 0,
        top: shownH > frame.h ? inset((1 - frame.h / shownH) / 2) : 0,
      },
      warnings,
    };
  }

  const empty = 1 - (shownW * shownH) / (frame.w * frame.h);
  if (empty > SEVERE_MISMATCH_FRACTION) {
    warnings.push(`leaves ${Math.round(empty * 100)}% of the frame empty (aspect mismatch or small image)`);
  }
  const cx = Math.round(shownW);
  const cy = Math.round(shownH);
  return {
    geometry: {
      placement: Placement.Fit,
      x: Math.round(frame.x + (frame.w - cx) / 2),
      y: Math.round(frame.y + (frame.h - cy) / 2),
      cx,
      cy,
    },
    warnings,
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
