// tycoslide-theme-default
// Default theme package for tycoslide

import {
  brandFonts,
  cardComponent,
  codeComponent,
  columnComponent,
  defineTheme,
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
import { brand } from "./brand.js";
import { buildFactsheetFormat } from "./formats/factsheet.js";
import { buildPresentationFormat } from "./formats/presentation.js";

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

export const TEMPLATE = {
  TITLE: "title",
  END: "end",
  SECTION: "section",
  BODY: "body",
  BODY_CENTERED: "body-centered",
  STAT: "stat",
  TWO_COLUMN: "two-column",
  STATEMENT: "statement",
  AGENDA: "agenda",
  CARDS: "cards",
  CARDS_FLAT: "cards-flat",
  BLANK: "blank",
  QUOTE: "quote",
  QUOTE_DARK: "quote-dark",
  SHAPES: "shapes",
  TRANSFORM: "transform",
  LINES: "lines",
} as const;

export const theme = defineTheme({
  fonts: brandFonts(brand),
  formats: {
    presentation: buildPresentationFormat(brand.colors.light),
    factsheet: buildFactsheetFormat(brand.colors.light),
  },
});
