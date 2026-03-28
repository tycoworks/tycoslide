// tycoslide-theme-default
// Default theme package for tycoslide

import type { MasterDefinition } from "@tycoworks/tycoslide";
import {
  cardComponent,
  codeComponent,
  columnComponent,
  gridComponent,
  imageComponent,
  labelComponent,
  lineComponent,
  listComponent,
  mermaidComponent,
  quoteComponent,
  rowComponent,
  shapeComponent,
  slideNumberComponent,
  stackComponent,
  tableComponent,
  testimonialComponent,
  textComponent,
} from "@tycoworks/tycoslide-components";
import { allLayouts } from "./layouts.js";
import { defaultMaster, minimalMaster } from "./master.js";

// Explicit component, layout, and master lists — themes declare what they use
export const components = [
  textComponent,
  labelComponent,
  imageComponent,
  cardComponent,
  quoteComponent,
  testimonialComponent,
  tableComponent,
  codeComponent,
  mermaidComponent,
  lineComponent,
  shapeComponent,
  slideNumberComponent,
  rowComponent,
  columnComponent,
  stackComponent,
  gridComponent,
  listComponent,
];

export const layouts = allLayouts;

export const masters: MasterDefinition[] = [defaultMaster, minimalMaster];

// Re-export component DSL functions for theme consumers
export * from "@tycoworks/tycoslide-components";
export type { Assets } from "./assets.js";
export { assets } from "./assets.js";
// Theme and assets
export { theme } from "./theme.js";
