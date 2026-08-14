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
import { SlotType } from "../types.js";
import { fillImage, isImageFill } from "./image.js";
import { fillTable, isTableFill } from "./table.js";
import { fillTemplate, isTemplateFill } from "./template.js";
import { fillText, isTextFill } from "./text.js";

/** The shape a filler targets, plus its slot-level options (startAt for text). */
export type FillTarget = { shapeName: string; startAt?: number };

/** A pptx-automizer element-modify callback: `(element, relation) => void`. */
export type ShapeCallback = (element: any, relation: any) => unknown;

export interface Filler<T> {
  matches(v: unknown): v is T;
  callbacks(value: T, target: FillTarget): ShapeCallback[];
}

export const FILLERS: Record<SlotType, Filler<any>> = {
  [SlotType.Template]: {
    matches: isTemplateFill,
    callbacks: (v, t) => [(el: any) => fillTemplate(el, v, t.shapeName)],
  },
  [SlotType.Text]: {
    matches: isTextFill,
    callbacks: (v, t) => [
      (el: any, relation: any) => fillText(el, v, { startAt: t.startAt ?? 0, relation, shapeName: t.shapeName }),
    ],
  },
  [SlotType.Table]: {
    matches: isTableFill,
    callbacks: (v, t) => [(el: any) => fillTable(el, v, t.shapeName)],
  },
  [SlotType.Image]: {
    matches: isImageFill,
    callbacks: (v, t) => [
      ModifyImageHelper.setRelationTarget(basename(v.path)),
      (el: any) => fillImage(el, v, t.shapeName),
    ],
  },
};
