// tycoslide-theme-default
// Default theme package for tycoslide

import {
  textComponent,
  plainTextComponent,
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
import type { MasterDefinition } from 'tycoslide';
import { allLayouts } from './layouts.js';
import { defaultMaster, minimalMaster } from './master.js';

// Explicit component, layout, and master lists — themes declare what they use
export const components = [
  textComponent,
  plainTextComponent,
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

// Theme and assets
export { theme } from './theme.js';
export { assets } from './assets.js';
export type { Assets } from './assets.js';

// Re-export component DSL functions for theme consumers
export * from 'tycoslide-components';
