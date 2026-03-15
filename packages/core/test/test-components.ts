// Test Component Stubs
// Minimal component definitions for core tests.
// Used by core tests that need components registered (slotCompiler, schema, registry, etc.)
//
// Text, Card, Row, Column have real render functions (needed by registry.test.ts).
// Image, Table, Line register metadata only — slotCompiler never calls render.
//
// Import testComponents array and call componentRegistry.register() in tests.

import type { Heading, Table as MdastTable, RootContent } from "mdast";
import { NODE_TYPE } from "../src/core/model/nodes.js";
import { schema } from "../src/core/model/schema.js";
import { extractSource, SYNTAX } from "../src/core/model/syntax.js";
import { token } from "../src/core/model/token.js";
import { DIRECTION, HALIGN, SIZE, TEXT_STYLE, VALIGN } from "../src/core/model/types.js";
import { component, type ComponentNode } from "../src/core/model/nodes.js";
import type { RenderContext } from "../src/core/rendering/registry.js";
import { defineComponent } from "../src/core/rendering/registry.js";

// Local component name const — core tests can't import from tycoslide-components
export const C = {
  Text: "text",
  Card: "card",
  Table: "table",
  Image: "image",
  Line: "line",
  Row: "row",
  Column: "column",
} as const;

// ============================================
// HEADING STYLE MAP (matches real text component)
// ============================================

const HEADING_STYLE: Record<number, string> = {
  1: TEXT_STYLE.H1,
  2: TEXT_STYLE.H2,
  3: TEXT_STYLE.H3,
  4: TEXT_STYLE.H4,
};

// ============================================
// TEXT (real render — used by registry.test.ts)
// ============================================

export const textComponent = defineComponent({
  name: C.Text,
  body: schema.string(),
  params: {
    style: schema.string().optional(),
    hAlign: schema.string().optional(),
    vAlign: schema.string().optional(),
    content: schema.string().optional(),
  },
  tokens: { color: token.required<any>(), style: token.required<any>(), linkColor: token.required<any>(), linkUnderline: token.required<any>(), hAlign: token.required<any>(), vAlign: token.required<any>() },
  mdast: {
    nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.HEADING, SYNTAX.LIST],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      if (node.type === SYNTAX.HEADING) {
        const heading = node as Heading;
        const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
        const raw = extractSource(heading, source);
        const content = raw.replace(/^#{1,6}\s*/, "");
        return component(C.Text, { body: content }, { style });
      }
      if (node.type === SYNTAX.PARAGRAPH) {
        const para = node as { children: { type: string }[] };
        if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
          throw new Error("Images cannot be embedded inline in text. Use :::image directive.");
        }
      }
      return component(C.Text, { body: extractSource(node, source) });
    },
  },
  render: (props: any, ctx: RenderContext, tokens: any): any => {
    const style = props.style ?? tokens?.style;
    return {
      type: NODE_TYPE.TEXT,
      content: [{ text: props.body }],
      style,
      resolvedStyle: (ctx.theme.textStyles as any)[style],
      color: props.color ?? tokens?.color,
      hAlign: (props.hAlign ?? HALIGN.LEFT) as any,
      vAlign: (props.vAlign ?? VALIGN.TOP) as any,
      lineHeightMultiplier: (ctx.theme.textStyles as any)[style]?.lineHeightMultiplier ?? 1.0,
      bulletIndentPt: 18,
    };
  },
});

// ============================================
// ROW (real render — used by registry.test.ts)
// ============================================

export const rowComponent = defineComponent({
  name: C.Row,
  slots: ["children"] as const,
  directive: false,
  tokens: {},
  render: (props: any): any => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.ROW,
    children: props.children,
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
    gap: props.gap ?? 0,
    vAlign: props.vAlign ?? VALIGN.TOP,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    padding: props.padding,
  }),
});

// ============================================
// COLUMN (real render — used by registry.test.ts via Card)
// ============================================

export const columnComponent = defineComponent({
  name: C.Column,
  slots: ["children"] as const,
  directive: false,
  tokens: {},
  render: (props: any): any => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    children: props.children,
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
    gap: props.gap ?? 0,
    vAlign: props.vAlign ?? VALIGN.TOP,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    padding: props.padding,
  }),
});

// ============================================
// CARD (real render — used by registry.test.ts)
// ============================================

export const cardComponent = defineComponent({
  name: C.Card,
  params: {
    title: schema.string().optional(),
    description: schema.string().optional(),
  },
  tokens: { background: token.required<any>(), padding: token.required<any>(), gap: token.required<any>(), hAlign: token.required<any>(), vAlign: token.required<any>(), title: token.required<any>(), description: token.required<any>() },
  render: (props: any, _ctx: RenderContext, tokens: any): any => {
    // Pass title tokens down to child Text component
    const titleNode = component(C.Text, { body: props.title ?? props.body ?? "" }, tokens.title);
    return component(C.Column, { children: [titleNode], padding: tokens.padding });
  },
});

// ============================================
// METADATA-ONLY STUBS (slotCompiler needs registration, not render)
// ============================================

export const imageComponent = defineComponent({
  name: C.Image,
  body: schema.string(),
  params: { alt: schema.string().optional() },
  tokens: {},
  render: () => ({}) as any,
});

export const lineComponent = defineComponent({
  name: C.Line,
  params: {
    beginArrow: schema.string().optional(),
    endArrow: schema.string().optional(),
  },
  tokens: { color: token.required<any>(), width: token.required<any>(), dashType: token.required<any>() },
  render: () => ({}) as any,
});

export const tableComponent = defineComponent({
  name: C.Table,
  body: schema.string(),
  params: {
    headerColumns: schema.number().optional(),
  },
  tokens: {
    borderStyle: token.required<any>(),
    borderColor: token.required<any>(),
    borderWidth: token.required<any>(),
    headerBackground: token.required<any>(),
    headerBackgroundOpacity: token.required<any>(),
    headerTextStyle: token.required<any>(),
    cellBackground: token.required<any>(),
    cellBackgroundOpacity: token.required<any>(),
    cellTextStyle: token.required<any>(),
    cellPadding: token.required<any>(),
    hAlign: token.required<any>(),
    vAlign: token.required<any>(),
  },
  mdast: {
    nodeTypes: [SYNTAX.TABLE],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      const tableNode = node as unknown as MdastTable;
      const rows = tableNode.children.map((row) =>
        row.children.map((cell) => {
          const children = cell.children;
          if (children.length === 0) return "";
          const start = children[0].position?.start.offset;
          const end = children[children.length - 1].position?.end.offset;
          if (start == null || end == null) return "";
          return source.slice(start, end).trim();
        }),
      );
      return component(C.Table, { data: rows, tableProps: { headerRows: 1 } });
    },
  },
  render: () => ({}) as any,
});

// ============================================
// ALL TEST COMPONENTS
// ============================================

export const testComponents = [
  textComponent,
  rowComponent,
  columnComponent,
  cardComponent,
  imageComponent,
  lineComponent,
  tableComponent,
];
