// tycoslide-theme-default
// Default theme package for tycoslide

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
} from "@tycoslide/sdk";

// Explicit component list — themes declare what they use
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

// Re-export component DSL functions for theme consumers
export * from "@tycoslide/sdk";
export type { Assets } from "./assets.js";
export { assets } from "./assets.js";
export { layouts } from "./layouts.js";
export { masters } from "./masters.js";
// Theme and assets
export { theme } from "./theme.js";
