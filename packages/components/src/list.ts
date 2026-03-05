// List Component
// Peer of text — handles bullet/numbered lists as its own component.
// Internal-only (no :::list directive). Available via list() DSL and MDAST handler.

import type { Root, PhrasingContent, List as MdastList, Paragraph, ListItem } from 'mdast';
import type { RootContent } from 'mdast';
import type { NormalizedRun, TextStyleName, HorizontalAlignment, VerticalAlignment, ExpansionContext } from 'tycoslide';
import { HALIGN, VALIGN, CONTENT, SYNTAX, extractSource } from 'tycoslide';
import { NODE_TYPE, type ElementNode } from 'tycoslide';
import { defineComponent, component, type ComponentNode, type SchemaShape } from 'tycoslide';
import { schema } from 'tycoslide';
import { Component } from './names.js';
import { transformInline, inlineProcessor } from './utils/inline.js';

export const LIST_TOKEN = {
  COLOR: 'color',
  BULLET_COLOR: 'bulletColor',
  STYLE: 'style',
  LINE_HEIGHT_MULTIPLIER: 'lineHeightMultiplier',
} as const;

export interface ListTokens {
  [LIST_TOKEN.COLOR]: string;
  [LIST_TOKEN.BULLET_COLOR]: string;
  [LIST_TOKEN.STYLE]: TextStyleName;
  [LIST_TOKEN.LINE_HEIGHT_MULTIPLIER]: number;
}

// ============================================
// TYPES
// ============================================

export interface ListProps {
  style?: TextStyleName;
  color?: string;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
  bulletColor?: string;
  lineHeightMultiplier?: number;
  ordered?: boolean;
  variant?: string;
}

type ListComponentProps = { body: string[]; ordered?: boolean } & ListProps;

// ============================================
// EXPAND
// ============================================

function expandList(props: ListComponentProps, context: ExpansionContext, tokens: ListTokens): ElementNode {
  const resolvedStyle = props.style ?? tokens.style;
  const resolvedColor = props.color ?? tokens.color;
  const resolvedBulletColor = props.bulletColor ?? tokens.bulletColor;
  const resolvedLineHeight = props.lineHeightMultiplier ?? tokens.lineHeightMultiplier;
  const textStyle = context.theme.textStyles[resolvedStyle];
  const bulletIndentPt = textStyle.fontSize * context.theme.spacing.bulletIndentMultiplier;

  const bulletType = props.ordered ? { type: 'number' as const } : true;
  const runs: NormalizedRun[] = [];

  for (let i = 0; i < props.body.length; i++) {
    const item = props.body[i];
    // Parse each item as RICH (inline formatting)
    const tree = inlineProcessor.parse(item) as Root;
    const itemRuns: NormalizedRun[] = [];
    for (const child of tree.children) {
      if (child.type === SYNTAX.PARAGRAPH) {
        transformInline(child.children, context.theme.colors, itemRuns, {});
      }
    }
    if (itemRuns.length > 0) {
      // First run gets bullet marker
      itemRuns[0] = { ...itemRuns[0], bullet: bulletType };
      // Add paragraph break between items (not before first)
      if (i > 0) {
        itemRuns[0] = { ...itemRuns[0], paragraphBreak: true };
      }
      runs.push(...itemRuns);
    }
  }

  // Apply bulletColor to all bullet runs
  if (resolvedBulletColor) {
    for (const run of runs) {
      if (run.bullet && typeof run.bullet === 'object') {
        run.bullet = { ...run.bullet, color: resolvedBulletColor };
      } else if (run.bullet === true) {
        run.bullet = { color: resolvedBulletColor };
      }
    }
  }

  return {
    type: NODE_TYPE.TEXT,
    content: runs,
    style: resolvedStyle,
    resolvedStyle: textStyle,
    color: resolvedColor,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    vAlign: props.vAlign ?? VALIGN.TOP,
    lineHeightMultiplier: resolvedLineHeight,
    bulletIndentPt,
  };
}

// ============================================
// MDAST HELPER
// ============================================

/** Extract items from a List MDAST node, handling nested lists recursively. */
function extractListItems(listNode: MdastList, source: string): string[] {
  const items: string[] = [];
  for (const item of listNode.children as ListItem[]) {
    const firstChild = item.children[0];
    if (firstChild && firstChild.type === SYNTAX.PARAGRAPH) {
      items.push(extractSource(firstChild as unknown as RootContent, source));
    } else if (firstChild && firstChild.type === SYNTAX.LIST) {
      // Nested list — flatten items
      items.push(...extractListItems(firstChild as MdastList, source));
    }
  }
  return items;
}

// ============================================
// COMPONENT REGISTRATION
// ============================================

export const listComponent = defineComponent({
  name: Component.List,
  body: schema.array(schema.string()),
  directive: false,
  tokens: [LIST_TOKEN.COLOR, LIST_TOKEN.BULLET_COLOR, LIST_TOKEN.STYLE, LIST_TOKEN.LINE_HEIGHT_MULTIPLIER],
  mdast: {
    nodeTypes: [SYNTAX.LIST],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      const listNode = node as unknown as MdastList;
      const items = extractListItems(listNode, source);
      return component(Component.List, { body: items, ordered: listNode.ordered ?? false });
    },
  },
  expand: expandList,
});

// ============================================
// DSL FUNCTION
// ============================================

/**
 * Create a list component node.
 *
 * @example
 * ```typescript
 * list(['First item', 'Second item', '**Bold** third item'])
 * list(['Step one', 'Step two'], { ordered: true })
 * ```
 */
export function list(items: string[], props?: ListProps): ComponentNode<ListComponentProps> {
  return component(Component.List, { body: items, ordered: false, ...props });
}
