// List Component
// Peer of text — handles bullet/numbered lists as its own component.
// Internal-only (no :::list directive). Available via list() DSL and MDAST handler.

import type { List as MdastList, ListItem } from 'mdast';
import type { RootContent } from 'mdast';
import type { NormalizedRun, TextStyleName, HorizontalAlignment, VerticalAlignment, ExpansionContext } from 'tycoslide';
import { SYNTAX, extractSource } from 'tycoslide';
import { NODE_TYPE, type ElementNode } from 'tycoslide';
import { defineComponent, component, type ComponentNode } from 'tycoslide';
import { schema } from 'tycoslide';
import { Component } from './names.js';
import { transformInline, inlineParse } from './utils/inline.js';

export const LIST_TOKEN = {
  COLOR: 'color',
  STYLE: 'style',
  LINK_COLOR: 'linkColor',
  LINK_UNDERLINE: 'linkUnderline',
  HALIGN: 'hAlign',
  VALIGN: 'vAlign',
  ACCENTS: 'accents',
} as const;

export type ListTokens = {
  [LIST_TOKEN.COLOR]: string;
  [LIST_TOKEN.STYLE]: TextStyleName;
  [LIST_TOKEN.LINK_COLOR]: string;
  [LIST_TOKEN.LINK_UNDERLINE]: boolean;
  [LIST_TOKEN.HALIGN]: HorizontalAlignment;
  [LIST_TOKEN.VALIGN]: VerticalAlignment;
  [LIST_TOKEN.ACCENTS]: Record<string, string>;
};

// ============================================
// TYPES
// ============================================

type ListComponentProps = { body: string[]; ordered?: boolean };

// ============================================
// EXPAND
// ============================================

function expandList(props: ListComponentProps, context: ExpansionContext, tokens: ListTokens): ElementNode {
  const textStyle = context.theme.textStyles[tokens.style];

  const bulletType = props.ordered ? { type: 'number' as const } : true;
  const runs: NormalizedRun[] = [];

  for (let i = 0; i < props.body.length; i++) {
    const item = props.body[i];
    // Parse each item as RICH (inline formatting)
    const tree = inlineParse(item);
    const itemRuns: NormalizedRun[] = [];
    for (const child of tree.children) {
      if (child.type === SYNTAX.PARAGRAPH) {
        transformInline(child.children, tokens.accents, itemRuns, {});
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

  return {
    type: NODE_TYPE.TEXT,
    content: runs,
    style: tokens.style,
    resolvedStyle: textStyle,
    color: tokens.color,
    hAlign: tokens.hAlign,
    vAlign: tokens.vAlign,
    lineHeightMultiplier: textStyle.lineHeightMultiplier,
    bulletIndentPt: textStyle.bulletIndentPt,
    linkColor: tokens.linkColor,
    linkUnderline: tokens.linkUnderline,
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
  markdown: false,
  tokens: Object.values(LIST_TOKEN),
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
 * list(['First item', 'Second item'], tokens.list)
 * list(['Step one', 'Step two'], tokens.list, true)
 * ```
 */
export function list(items: string[], tokens: ListTokens, ordered?: boolean): ComponentNode<ListComponentProps> {
  return component(Component.List, { body: items, ordered: ordered ?? false }, tokens);
}
