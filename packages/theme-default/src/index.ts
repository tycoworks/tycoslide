// tycoslide-theme-default
// Default theme package for tycoslide

import { registerComponents, registerLayouts } from 'tycoslide';
import {
  textComponent,
  imageComponent,
  cardComponent,
  quoteComponent,
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
} from 'tycoslide-components';
import { allLayouts } from './layouts.js';

// Explicit component and layout lists — themes declare what they use
export const components = [
  textComponent,
  imageComponent,
  cardComponent,
  quoteComponent,
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
];

export const layouts = allLayouts;

// Register on import — theme entry point is the single registration site
registerComponents(components);
registerLayouts(layouts);

// Theme and assets
export { theme } from './theme.js';
export { assets } from './assets.js';
export type { Assets } from './assets.js';

// Re-export layouts namespace for backward compat
export * from './layouts.js';

// Re-export component DSL functions for theme consumers
export * from 'tycoslide-components';
