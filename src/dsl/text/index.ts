// Text Component
// Parses markdown string and expands to a TextNode with NormalizedRun[]

import { defineComponent, type ComponentNode } from '../../core/registry.js';
import type { TextStyleName, HorizontalAlignment, VerticalAlignment } from '../../core/types.js';
import { HALIGN, VALIGN } from '../../core/types.js';
import { NODE_TYPE, type ElementNode } from '../../core/nodes.js';
import { parseMarkdown, mdastToRuns } from './mdastToRuns.js';

// ============================================
// CONSTANTS
// ============================================

/** Component name for text */
export const TEXT_COMPONENT = 'text' as const;

// ============================================
// TYPES
// ============================================

/** Style options for text (everything except the content string) */
export interface TextProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  bulletColor?: string;
  lineHeightMultiplier?: number;
}

/** Full props including content (used internally by expansion) */
export interface TextComponentProps extends TextProps {
  content: string;
}

// ============================================
// EXPANSION FUNCTION
// ============================================

function expandText(props: TextComponentProps, context: { theme: any }): ElementNode {
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

const textComponent = defineComponent<TextComponentProps>(
  TEXT_COMPONENT,
  expandText
);

/**
 * Create a text component node.
 *
 * @example
 * ```typescript
 * text("**Bold** and :teal[highlighted] text.")
 * text("- First bullet\n- Second bullet", { style: TEXT_STYLE.BODY })
 * ```
 */
export function text(content: string, props?: TextProps): ComponentNode<TextComponentProps> {
  return textComponent({ content, ...props });
}
