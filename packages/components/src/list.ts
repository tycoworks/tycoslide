// List Component
// Peer of text — handles bullet/numbered lists as its own component.
// Internal-only (no :::list directive). Available via list() DSL and MDAST handler.

import type { ListItem, List as MdastList, RootContent } from "mdast";
import type { HorizontalAlignment, NormalizedRun, RenderContext, TextStyleName, VerticalAlignment } from "tycoslide";
import {
  type ComponentNode,
  component,
  defineComponent,
  extractSource,
  type InferParams,
  type InferTokens,
  NODE_TYPE,
  param,
  type Shadow,
  SYNTAX,
  schema,
  type TextNode,
  token,
} from "tycoslide";
import { Component } from "./names.js";
import { inlineParse, transformInline } from "./utils/inline.js";

const listTokens = token.shape({
  color: token.required<string>(),
  style: token.required<TextStyleName>(),
  linkColor: token.required<string>(),
  linkUnderline: token.required<boolean>(),
  hAlign: token.required<HorizontalAlignment>(),
  vAlign: token.required<VerticalAlignment>(),
  accents: token.required<Record<string, string>>(),
  shadow: token.optional<Shadow>(),
});

export type ListTokens = InferTokens<typeof listTokens>;

// ============================================
// TYPES
// ============================================

const listParamShape = param.shape({
  ordered: param.optional(schema.boolean()),
});
export type ListParams = InferParams<typeof listParamShape>;

// ============================================
// RENDER
// ============================================

function renderList(params: ListParams, content: string[], context: RenderContext, tokens: ListTokens): TextNode {
  const textStyle = context.theme.textStyles[tokens.style];

  const bulletType = params.ordered ? { type: "number" as const } : true;
  const runs: NormalizedRun[] = [];

  for (let i = 0; i < content.length; i++) {
    const item = content[i];
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

  const node: TextNode = {
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
  if (tokens.shadow) {
    node.shadow = tokens.shadow;
  }
  return node;
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
  content: schema.array(schema.string()),
  params: listParamShape,
  directive: false,
  tokens: listTokens,
  mdast: {
    nodeTypes: [SYNTAX.LIST],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      const listNode = node as unknown as MdastList;
      const items = extractListItems(listNode, source);
      return component(Component.List, { ordered: listNode.ordered ?? false }, items);
    },
  },
  render: renderList,
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
export function list(items: string[], tokens: ListTokens, ordered?: boolean): ComponentNode {
  return component(Component.List, { ordered: ordered ?? false }, items, tokens);
}
