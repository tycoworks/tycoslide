// Markdown Component
// Parses markdown string and expands to a TextNode with NormalizedRun[]

import { defineComponent, type ComponentNode } from '../../core/componentRegistry.js';
import type { TextStyleName, HorizontalAlignment, VerticalAlignment } from '../../core/types.js';
import { HALIGN, VALIGN } from '../../core/types.js';
import { NODE_TYPE, type ElementNode } from '../../core/nodes.js';
import { parseMarkdown, mdastToRuns } from './mdastToRuns.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for markdown */
export const MARKDOWN_COMPONENT = 'markdown' as const;

// ============================================
// TYPES
// ============================================

/** Style options for markdown (everything except the content string) */
export interface MarkdownStyleProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  bulletColor?: string;
  lineHeightMultiplier?: number;
}

/** Full props including content (used internally by expansion) */
export interface MarkdownProps extends MarkdownStyleProps {
  content: string;
}

// ============================================
// EXPANSION FUNCTION
// ============================================

function expandMarkdown(props: MarkdownProps, context: { theme: any }): ElementNode {
  const tree = parseMarkdown(props.content);
  const runs = mdastToRuns(tree, context.theme.highlights);

  // Apply bulletColor to all bullet runs if specified
  if (props.bulletColor) {
    for (const run of runs) {
      if (run.bullet && typeof run.bullet === 'object') {
        run.bullet = { ...run.bullet, color: props.bulletColor };
      } else if (run.bullet === true) {
        run.bullet = { color: props.bulletColor };
      }
    }
  }

  return {
    type: NODE_TYPE.TEXT,
    content: runs,
    style: props.style,
    color: props.color,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    vAlign: props.vAlign ?? VALIGN.TOP,
    lineHeightMultiplier: props.lineHeightMultiplier,
  };
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

const markdownComponent = defineComponent<MarkdownProps>(
  MARKDOWN_COMPONENT,
  expandMarkdown
);

/**
 * Create a markdown component node.
 *
 * @example
 * ```typescript
 * markdown("**Bold** and :teal[highlighted] text.")
 * markdown("- First bullet\n- Second bullet", { style: TEXT_STYLE.BODY })
 * ```
 */
export function markdown(content: string, props?: MarkdownStyleProps): ComponentNode<MarkdownProps> {
  return markdownComponent({ content, ...props });
}
