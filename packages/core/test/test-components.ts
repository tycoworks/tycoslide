// Test Component Stubs
// Minimal component definitions registered with the real componentRegistry.
// Used by core tests that need components registered (slotCompiler, schema, registry, etc.)
//
// Text, Card, Row, Column have real expand functions (needed by registry.test.ts).
// Image, Table, Line register metadata only — slotCompiler never calls expand.
//
// Import this file for side-effect registration in core tests.

import { componentRegistry, component } from '../src/core/rendering/registry.js';
import type { ExpansionContext, ComponentNode } from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import type { ElementNode } from '../src/core/model/nodes.js';
import { HALIGN, VALIGN, SIZE, DIRECTION, TEXT_STYLE, CONTENT } from '../src/core/model/types.js';
import { SYNTAX, extractSource } from '../src/core/model/syntax.js';
import { schema } from '../src/core/model/schema.js';
import type { RootContent, Heading, Table as MdastTable } from 'mdast';

// Local component name const — core tests can't import from tycoslide-components
export const C = {
  Text: 'text', Card: 'card', Table: 'table',
  Image: 'image', Line: 'line',
  Row: 'row', Column: 'column',
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
// TEXT (real expand — used by registry.test.ts)
// ============================================

componentRegistry.define({
  name: C.Text,
  body: schema.string(),
  params: {
    style: schema.string().optional(),
    hAlign: schema.string().optional(),
    vAlign: schema.string().optional(),
    content: schema.string().optional(),
    variant: schema.string().optional(),
  },
  tokens: ['color', 'bulletColor', 'style', 'lineHeightMultiplier'],
  mdast: {
    nodeTypes: [SYNTAX.PARAGRAPH, SYNTAX.LIST, SYNTAX.HEADING],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      if (node.type === SYNTAX.HEADING) {
        const heading = node as Heading;
        const style = HEADING_STYLE[heading.depth] ?? TEXT_STYLE.H3;
        const raw = extractSource(heading, source);
        const content = raw.replace(/^#{1,6}\s*/, '');
        return component(C.Text, { body: content, content: CONTENT.PROSE, style });
      }
      if (node.type === SYNTAX.PARAGRAPH) {
        const para = node as { children: { type: string }[] };
        if (para.children.length === 1 && para.children[0].type === SYNTAX.IMAGE) {
          throw new Error('Images cannot be embedded inline in text. Use :::image directive.');
        }
      }
      return component(C.Text, { body: extractSource(node, source), content: CONTENT.PROSE });
    },
  },
  expand: (props: any, _ctx: ExpansionContext, tokens: any): any => ({
    type: NODE_TYPE.TEXT,
    content: [{ text: props.body }],
    style: props.style ?? tokens?.style,
    color: props.color ?? tokens?.color,
    hAlign: (props.hAlign ?? HALIGN.LEFT) as any,
    vAlign: (props.vAlign ?? VALIGN.TOP) as any,
  }),
});

// ============================================
// ROW (real expand — used by registry.test.ts)
// ============================================

componentRegistry.define({
  name: C.Row,
  params: {
    gap: schema.string().optional(),
    vAlign: schema.string().optional(),
    hAlign: schema.string().optional(),
    padding: schema.number().optional(),
    width: schema.string().optional(),
    height: schema.string().optional(),
  },
  slots: ['children'] as const,
  expand: (props: any): any => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.ROW,
    children: props.children as ElementNode[],
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
    gap: props.gap,
    vAlign: props.vAlign ?? VALIGN.TOP,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    padding: props.padding,
  }),
});

// ============================================
// COLUMN (real expand — used by registry.test.ts via Card)
// ============================================

componentRegistry.define({
  name: C.Column,
  params: {
    gap: schema.string().optional(),
    vAlign: schema.string().optional(),
    hAlign: schema.string().optional(),
    padding: schema.number().optional(),
    width: schema.string().optional(),
    height: schema.string().optional(),
  },
  slots: ['children'] as const,
  expand: (props: any): any => ({
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    children: props.children as ElementNode[],
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
    gap: props.gap,
    vAlign: props.vAlign ?? VALIGN.TOP,
    hAlign: props.hAlign ?? HALIGN.LEFT,
    padding: props.padding,
  }),
});

// ============================================
// CARD (real expand — used by registry.test.ts)
// ============================================

componentRegistry.define({
  name: C.Card,
  params: {
    title: schema.string().optional(),
    description: schema.string().optional(),
    variant: schema.string().optional(),
  },
  tokens: [
    'padding', 'cornerRadius', 'backgroundColor', 'backgroundOpacity',
    'borderColor', 'borderWidth', 'titleStyle', 'titleColor',
    'descriptionStyle', 'descriptionColor', 'gap', 'textGap', 'hAlign', 'vAlign',
  ],
  expand: (props: any, _ctx: ExpansionContext, tokens: any): any => {
    const titleNode = component(C.Text, { body: props.title ?? props.body ?? '' });
    return component(C.Column, { children: [titleNode], padding: tokens.padding });
  },
});

// ============================================
// METADATA-ONLY STUBS (slotCompiler needs registration, not expand)
// ============================================

componentRegistry.define({
  name: C.Image,
  body: schema.string(),
  params: { alt: schema.string().optional() },
  expand: () => ({}) as any,
});

componentRegistry.define({
  name: C.Line,
  params: {
    variant: schema.string().optional(),
    beginArrow: schema.string().optional(),
    endArrow: schema.string().optional(),
  },
  tokens: ['color', 'width', 'dashType'],
  expand: () => ({}) as any,
});

componentRegistry.define({
  name: C.Table,
  body: schema.string(),
  params: {
    variant: schema.string().optional(),
    headerColumns: schema.number().optional(),
  },
  tokens: [
    'borderStyle', 'borderColor', 'borderWidth',
    'headerBackground', 'headerBackgroundOpacity', 'headerTextStyle',
    'cellBackground', 'cellBackgroundOpacity', 'cellTextStyle',
    'cellPadding', 'hAlign', 'vAlign',
  ],
  mdast: {
    nodeTypes: [SYNTAX.TABLE],
    compile: (node: RootContent, source: string): ComponentNode | null => {
      const tableNode = node as unknown as MdastTable;
      const rows = tableNode.children.map(row =>
        row.children.map(cell => {
          const children = cell.children;
          if (children.length === 0) return '';
          const start = children[0].position?.start.offset;
          const end = children[children.length - 1].position?.end.offset;
          if (start == null || end == null) return '';
          return source.slice(start, end).trim();
        })
      );
      return component(C.Table, { data: rows, tableProps: { headerRows: 1 } });
    },
  },
  expand: () => ({}) as any,
});
