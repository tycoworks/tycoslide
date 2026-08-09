/**
 * Text fill — rebuilds a shape's paragraphs from a TextFill by harvesting
 * specimen (pPr, rPr) buckets grouped by (bullet kind, level), detaching
 * specimens from startAt onward, then building fresh paragraphs cloning the
 * appropriate bucket. This is the strategy for body blocks, bullet lists, rich
 * runs, and syntax-highlighted code.
 */

import { isPlainObject, rebuildParagraphs } from "../dom.js";
import type { TextFill } from "../types.js";

/**
 * Fill a text shape by rebuilding paragraphs from harvested specimen styles.
 *
 * Harvests specimen (pPr,rPr) buckets grouped by (bullet kind, level),
 * detaches specimens from startAt onward, then builds fresh paragraphs
 * cloning the appropriate bucket. Bullet input paragraphs pick a bullet
 * bucket by level (clamped); non-bullet input picks the plain bucket. If a
 * non-bullet paragraph follows any bullet paragraph, the bullet template's
 * spcBef is grafted onto it (transition spacing).
 *
 * Rich per-paragraph runs (bold/italic/color/link) come through unchanged
 * via setRichRuns.
 */
export function fillText(
  shape: any,
  fill: TextFill,
  opts: { startAt?: number; relation?: any; shapeName?: string } = {},
): void {
  const { startAt = 0, relation, shapeName = "" } = opts;
  rebuildParagraphs(shape, fill.paragraphs, startAt, relation, shapeName);
}

/** Discriminator for TextFill values. */
export function isTextFill(v: unknown): v is TextFill {
  return isPlainObject(v) && Array.isArray((v as { paragraphs?: unknown }).paragraphs);
}
