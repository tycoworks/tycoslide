// Test Component Stubs
// Minimal component definitions for markdown compilation tests.
// Used by SDK tests that need components (slotCompiler, documentCompiler, etc.)
//
// Text, Card, Row, Column have real render functions.
// Image, Table, Line register metadata only — slotCompiler never calls render.

import {
  type ComponentNode,
  component,
  DIRECTION,
  extractSource,
  HALIGN,
  NODE_TYPE,
  type RenderContext,
  SIZE,
  SYNTAX,
  VALIGN,
} from "@tycoslide/core";
import { defineComponent, param, schema } from "@tycoslide/sdk";
import type { Heading, Table as MdastTable, RootContent } from "mdast";

// Local component name const — core tests can't import from tycoslide-components
export const C = {
  Text: "text",
  Card: "card",
  Table: "table",
  Image: "image",
  Line: "line",
  Label: "label",
  Row: "row",
  Column: "column",
} as const;

// ============================================
// TEXT (real render)
// ============================================

export const textComponent = defineComponent({
  name: C.Text,
  content: schema.string(),
  params: {
    style: param.optional(schema.string()),
    hAlign: param.optional(schema.string()),
    vAlign: param.optional(schema.string()),
    content: param.optional(schema.string()),
  },
  mdast: {
    nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.LIST],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      if (node.type === SYNTAX.PARAGRAPH) {
        const para = node as { children: { type: string }[] };
        if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
          throw new Error("Images cannot be embedded inline in text. Use :::image directive.");
        }
      }
      return component(C.Text, {}, extractSource(node, source));
    },
  },
  render: (params: any, content: string, ctx: RenderContext, tokens: any): any => {
    const style = params.style ?? tokens?.style;
    return {
      type: NODE_TYPE.TEXT,
      width: SIZE.FILL,
      height: SIZE.HUG,
      content: [{ text: content }],
      style,
      resolvedStyle: (ctx.theme.textStyles as any)[style],
      color: params.color ?? tokens?.color,
      hAlign: (params.hAlign ?? HALIGN.LEFT) as any,
      vAlign: (params.vAlign ?? VALIGN.TOP) as any,
      lineHeight: (ctx.theme.textStyles as any)[style]?.lineHeight ?? 1.0,
      bulletIndentPt: 18,
    };
  },
});

// ============================================
// ROW (real render)
// ============================================

export const rowComponent = defineComponent({
  name: C.Row,
  children: true,
  directive: false,
  render: (params: any, children: any[]): any => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.ROW,
    children,
    width: params.width ?? SIZE.FILL,
    height: params.height ?? SIZE.HUG,
    spacing: params.spacing,
    vAlign: params.vAlign ?? VALIGN.TOP,
    hAlign: params.hAlign ?? HALIGN.LEFT,
    padding: params.padding,
  }),
});

// ============================================
// COLUMN (real render)
// ============================================

export const columnComponent = defineComponent({
  name: C.Column,
  children: true,
  directive: false,
  render: (params: any, children: any[]): any => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    children,
    width: params.width ?? SIZE.FILL,
    height: params.height ?? SIZE.HUG,
    spacing: params.spacing,
    vAlign: params.vAlign ?? VALIGN.TOP,
    hAlign: params.hAlign ?? HALIGN.LEFT,
    padding: params.padding,
  }),
});

// ============================================
// CARD (real render)
// ============================================

export const cardComponent = defineComponent({
  name: C.Card,
  params: {
    title: param.optional(schema.string()),
    description: param.optional(schema.string()),
  },
  render: (params: any, content: any, _ctx: RenderContext, tokens: any): any => {
    // Pass title tokens down to child Text component
    const titleNode = component(C.Text, {}, params.title ?? content ?? "", tokens.title);
    return component(C.Column, { padding: tokens.padding }, [titleNode]);
  },
});

// ============================================
// LABEL (metadata-only — heading handler for slotCompiler tests)
// ============================================

export const labelComponent = defineComponent({
  name: C.Label,
  content: schema.string(),
  directive: false,
  mdast: {
    nodeTypes: [SYNTAX.HEADING],
    compile: (node: RootContent, source: string): ComponentNode => {
      const heading = node as Heading;
      const raw = extractSource(heading, source);
      const headingContent = raw.replace(/^#{1,6}\s*/, "");
      return component(C.Label, { headingDepth: heading.depth }, headingContent);
    },
  },
  render: () => ({}) as any,
});

// ============================================
// METADATA-ONLY STUBS (slotCompiler needs registration, not render)
// ============================================

export const imageComponent = defineComponent({
  name: C.Image,
  content: schema.string(),
  render: () => ({}) as any,
});

export const lineComponent = defineComponent({
  name: C.Line,
  directive: false,
  render: () => ({}) as any,
});

export const tableComponent = defineComponent({
  name: C.Table,
  content: schema.string(),
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
      return component(C.Table, { data: rows });
    },
  },
  render: () => ({}) as any,
});

// ============================================
// ALL TEST COMPONENTS
// ============================================

export const testComponents = [
  textComponent,
  labelComponent,
  rowComponent,
  columnComponent,
  cardComponent,
  imageComponent,
  lineComponent,
  tableComponent,
];
