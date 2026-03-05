// tycoslide-theme-default
// Default theme package for tycoslide

import {
  textComponent,
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
} from 'tycoslide-components';
import { allLayouts } from './layouts.js';

// Explicit component and layout lists — themes declare what they use
export const components = [
  textComponent,
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

// Theme and assets
export { theme } from './theme.js';
export { assets } from './assets.js';
export type { Assets } from './assets.js';

// Re-export component DSL functions for theme consumers
export * from 'tycoslide-components';
