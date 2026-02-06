// Layout Type Definitions
// Shared types for layout computation

import type { Theme } from '../types.js';
import type { TextMeasurer } from '../../utils/text-measurer.js';

/**
 * Context bundle for layout computation.
 * Combines theme and text measurer into a single object for cleaner function signatures.
 */
export interface LayoutContext {
  theme: Theme;
  measurer: TextMeasurer;
}
