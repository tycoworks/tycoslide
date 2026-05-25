// tycoslide-theme-default
// Default theme package for tycoslide

import {
  brandFonts,
  type ComponentSpec,
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
import { assets } from "./assets.js";
import { brand } from "./brand.js";
import { buildPresentationFormat } from "./formats/presentation.js";

// Explicit component list — themes declare what they use
export const components: ComponentSpec[] = [
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
export { assets } from "./assets.js";
export { fonts } from "./fonts.js";

export const TEMPLATE = {
  TITLE: "title",
  TITLE_DARK: "title-dark",
  SECTION: "section",
  BODY: "body",
  BODY_CENTERED: "body-centered",
  STATEMENT: "statement",
  AGENDA: "agenda",
  CARDS: "cards",
} as const;

export const theme = defineTheme({
  fonts: brandFonts(brand),
  formats: {
    presentation: buildPresentationFormat(brand.colors.light),
  },
  assets,
});
