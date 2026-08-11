/**
 * The `Filler` strategy registry — one plain-object strategy per SlotType, each
 * pairing a value discriminator with a slide-level fill. The record key IS the
 * slot type, so a strategy carries no redundant `type` field. `generate()`
 * consults `FILLERS[slot.type]` once per (slot, value): `matches` validates the
 * value shape, then `fill` applies it to the slide.
 *
 * Element-level geometry lives in the `fillX` primitives; slide-level concerns
 * (media pre-swap for images, relation access for body hyperlinks, column
 * validation for tables) live in the strategy wrappers here.
 */

import { basename } from "node:path";
import { ModifyImageHelper } from "pptx-automizer";
import { type Slot, SlotType } from "../types.js";
import { fillImage, isImageFill } from "./image.js";
import { fillTable, isTableFill } from "./table.js";
import { fillTemplate, isTemplateFill } from "./template.js";
import { fillText, isTextFill } from "./text.js";

export type FillContext = { layoutName: string };

export interface Filler<T> {
  matches(v: unknown): v is T;
  /** Human name for the mismatch error — no magic string at the throw site. */
  label: string;
  fill(slide: any, slot: Slot, value: T, ctx: FillContext): void;
}

export const FILLERS: Record<SlotType, Filler<any>> = {
  [SlotType.Template]: {
    matches: isTemplateFill,
    label: "TemplateFill",
    fill: (slide, slot, v) => slide.modifyElement(slot.shapeName, [(el: any) => fillTemplate(el, v, slot.shapeName)]),
  },
  [SlotType.Text]: {
    matches: isTextFill,
    label: "TextFill",
    fill: (slide, slot, v) => {
      const startAt = slot.startAt ?? 0;
      slide.modifyElement(slot.shapeName, [
        (el: any, relation: any) => fillText(el, v, { startAt, relation, shapeName: slot.shapeName }),
      ]);
    },
  },
  [SlotType.Table]: {
    matches: isTableFill,
    label: "TableFill",
    fill: (slide, slot, v) => {
      slide.modifyElement(slot.shapeName, [(el: any) => fillTable(el, v, slot.shapeName)]);
    },
  },
  [SlotType.Image]: {
    matches: isImageFill,
    label: "ImageFill",
    fill: (slide, slot, v) =>
      slide.modifyElement(slot.shapeName, [
        ModifyImageHelper.setRelationTarget(basename(v.path)),
        (el: any) => fillImage(el, v, slot.shapeName),
      ]),
  },
};
