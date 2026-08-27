/**
 * The `Filler` strategy registry — one plain-object strategy per SlotType, each
 * pairing a value discriminator with the element-level modify callbacks that
 * apply it. The record key IS the slot type, so a strategy carries no redundant
 * `type` field.
 *
 * `callbacks(value, target)` returns the `(element, relation)` callbacks that
 * fill one shape. They are deliberately shape-name-agnostic beyond the `target`
 * so they can be applied two ways: `slide.modifyElement(name, callbacks)` for a
 * shape already on the cloned base slide, or `slide.addElement(alias, n, name,
 * callbacks)` for a shape transplanted from another slide — pptx-automizer runs
 * an appended shape's callbacks against the imported element itself, so the same
 * callbacks refill a transplant.
 *
 * Element-level geometry lives in the `fillX` primitives; cross-shape concerns
 * (media pre-swap for images) live in the callbacks here.
 */

import { basename } from "node:path";
import { ModifyImageHelper } from "pptx-automizer";
import { type BodyRows, type ImageFill, SlotType, type TableFill, type TemplateFill, type TextFill } from "../types.js";
import { fillImage, isImageFill } from "./image.js";
import { fillTable, isTableFill } from "./table.js";
import { fillTemplate, isTemplateFill } from "./template.js";
import { fillText, isTextFill } from "./text.js";

/**
 * The shape a filler targets — a union discriminated by `type` (mirroring the
 * `Block` variants), so each filler's callback sees only its own specimen
 * options. Every target carries a `shapeName` and a human `label` for
 * diagnostics (the author-facing "slide N, layout …, slot …" a filler prints in
 * advisory warnings instead of the raw PPTX shape id); a text target may carry
 * `startAt`, and a table target carries its required `bodyRows` range.
 */
export type TemplateFillTarget = { type: typeof SlotType.Template; shapeName: string; label: string };
export type TextFillTarget = { type: typeof SlotType.Text; shapeName: string; label: string; startAt?: number };
export type TableFillTarget = { type: typeof SlotType.Table; shapeName: string; label: string; bodyRows: BodyRows };
export type ImageFillTarget = { type: typeof SlotType.Image; shapeName: string; label: string };
export type FillTarget = TemplateFillTarget | TextFillTarget | TableFillTarget | ImageFillTarget;

/** A pptx-automizer element-modify callback: `(element, relation) => void`. */
export type ShapeCallback = (element: any, relation: any) => unknown;

export interface Filler<T, Tgt extends FillTarget = FillTarget> {
  matches(v: unknown): v is T;
  callbacks(value: T, target: Tgt): ShapeCallback[];
}

const templateFiller: Filler<TemplateFill, TemplateFillTarget> = {
  matches: isTemplateFill,
  callbacks: (v, t) => [(el: any) => fillTemplate(el, v, t.shapeName)],
};

const textFiller: Filler<TextFill, TextFillTarget> = {
  matches: isTextFill,
  callbacks: (v, t) => [
    (el: any, relation: any) => fillText(el, v, { startAt: t.startAt ?? 0, relation, shapeName: t.shapeName }),
  ],
};

// `t` is a TableFillTarget, so `t.bodyRows` is a guaranteed `BodyRows` tuple.
// `targetOf` builds this target from a `TableBlock`, whose `bodyRows` is required,
// and the Zod theme schema rejects a table block without a `bodyRows` range; a
// table filler therefore cannot be reached without one.
const tableFiller: Filler<TableFill, TableFillTarget> = {
  matches: isTableFill,
  callbacks: (v, t) => [(el: any) => fillTable(el, v, t.shapeName, t.bodyRows)],
};

const imageFiller: Filler<ImageFill, ImageFillTarget> = {
  matches: isImageFill,
  callbacks: (v, t) => [
    ModifyImageHelper.setRelationTarget(basename(v.path)),
    (el: any) => fillImage(el, v, t.shapeName, t.label),
  ],
};

export const FILLERS: Record<SlotType, Filler<any>> = {
  [SlotType.Template]: templateFiller,
  [SlotType.Text]: textFiller,
  [SlotType.Table]: tableFiller,
  [SlotType.Image]: imageFiller,
};
