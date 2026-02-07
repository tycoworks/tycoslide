// Text Measurer Interface
// Abstracts text measurement to allow swappable implementations

import type { TextContent, TextStyle, Theme } from '../core/types.js';

/**
 * TextMeasurer provides text measurement capabilities.
 * Implementations can use fontkit, browser rendering, or other strategies.
 */
export interface TextMeasurer {
  /**
   * Get the line height in inches for a TextStyle.
   * Uses style.lineHeightMultiplier if set, otherwise theme.spacing.lineSpacing.
   */
  getStyleLineHeight(style: TextStyle, theme: Theme): number;

  /**
   * Estimate the number of wrapped lines for content at a given width.
   * @returns Line count (minimum 1)
   */
  estimateLines(content: TextContent, style: TextStyle, availableWidth: number): number;

  /**
   * Get the width needed to render content without wrapping (in inches).
   * Includes any packing buffer for rendering differences.
   */
  getContentWidth(content: TextContent, style: TextStyle): number;
}
