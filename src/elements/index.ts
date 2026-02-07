// Elements Barrel Export
// Importing this module registers all element handlers with the elementHandlerRegistry

// Import elements to trigger registration
import './line.js';
import './rectangle.js';
import './text.js';
import './image.js';
import './slide-number.js';
import './container.js';

// Re-export handlers for direct access if needed
export { lineHandler } from './line.js';
export { rectangleHandler } from './rectangle.js';
export { textHandler } from './text.js';
export { imageHandler } from './image.js';
export { slideNumberHandler } from './slide-number.js';
export { rowHandler, columnHandler, stackHandler } from './container.js';
