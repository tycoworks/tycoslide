// Handler Registry Barrel Export
// Importing this module registers all handlers with the nodeHandlerRegistry

// Import handlers to trigger registration
import './line.js';
import './rectangle.js';
import './text.js';
import './image.js';
import './slide-number.js';
import './diagram.js';
import './container.js';

// Re-export registry
export { nodeHandlerRegistry, render, getIntrinsicWidth } from './registry.js';
export type { LayoutContext, NodeHandler, RenderContext } from './registry.js';

// Re-export flex algorithm
export { distributeFlexSpace } from './flex.js';
export type { FlexChild } from './flex.js';

// Re-export handlers for direct access if needed
export { lineHandler } from './line.js';
export { rectangleHandler } from './rectangle.js';
export { textHandler } from './text.js';
export { imageHandler } from './image.js';
export { slideNumberHandler } from './slide-number.js';
export { diagramHandler } from './diagram.js';
export { rowHandler, columnHandler, stackHandler } from './container.js';
