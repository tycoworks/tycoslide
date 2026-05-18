// tycoslide-theme-default
// Default theme package for tycoslide

import {
  brandFonts,
  type ComponentConfig,
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
import { assetCatalog } from "./assets.js";
import { brand } from "./brand.js";
import { buildPresentationFormat } from "./formats/presentation.js";

// Explicit component list — themes declare what they use
export const components: ComponentConfig[] = [
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
export { assetCatalog, assetPaths } from "./assets.js";
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
  TRANSFORM: "transform",
} as const;

export const theme = defineTheme({
  fonts: brandFonts(brand),
  formats: {
    presentation: buildPresentationFormat(brand.colors.light),
  },
  assets: assetCatalog,
});
