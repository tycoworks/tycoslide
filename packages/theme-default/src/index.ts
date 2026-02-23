// tycoslide-theme-default
// Default theme package for tycoslide

// Theme and assets
export { theme } from './theme.js';
export { assets } from './assets.js';
export type { Assets } from './assets.js';

// Layouts namespace (side-effect: registers with layoutRegistry on import)
import * as layouts from './layouts.js';
export { layouts };

// Re-export components (side-effect: registers on import)
import * as components from 'tycoslide-components';
export { components };
export * from 'tycoslide-components';
