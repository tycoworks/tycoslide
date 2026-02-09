// Node Utilities
// Shared helpers for working with node types

import { NODE_TYPE, type TextNode } from '../core/nodes.js';
import type { Theme, TextContent } from '../core/types.js';
import { GAP } from '../core/types.js';

/**
 * Extract TextContent from a TextNode or pass through if already TextContent.
 * Used when APIs accept either TextContent or TextNode for flexibility.
 */
export function toTextContent(item: TextContent | TextNode): TextContent {
  if (typeof item === 'object' && item !== null && 'type' in item && item.type === NODE_TYPE.TEXT) {
    return item.content;
  }
  return item as TextContent;
}

/**
 * Resolve GAP constant to actual spacing value from theme.
 */
export function resolveGap(gap: string | undefined, theme: Theme): number {
  switch (gap) {
    case GAP.NONE: return 0;
    case GAP.TIGHT: return theme.spacing.gapTight;
    case GAP.LOOSE: return theme.spacing.gapLoose;
    case GAP.NORMAL:
    default: return theme.spacing.gap;
  }
}
