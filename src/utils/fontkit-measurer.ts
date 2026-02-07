// Fontkit-based Text Measurer
// Wraps existing font-utils functions in the TextMeasurer interface

import type { TextMeasurer } from './text-measurer.js';
import type { TextContent, TextStyle, Theme } from '../core/types.js';
import { getStyleLineHeight, estimateLines, getContentWidth } from './font-utils.js';

/**
 * TextMeasurer implementation using fontkit for font metric estimation.
 * This is the existing behavior, now wrapped in an interface.
 */
export class FontkitTextMeasurer implements TextMeasurer {
  getStyleLineHeight(style: TextStyle, theme: Theme): number {
    return getStyleLineHeight(style, theme);
  }

  estimateLines(content: TextContent, style: TextStyle, availableWidth: number): number {
    return estimateLines(content, style, availableWidth);
  }

  getContentWidth(content: TextContent, style: TextStyle): number {
    return getContentWidth(content, style);
  }
}

/** Singleton instance for default usage */
export const fontkitMeasurer = new FontkitTextMeasurer();
