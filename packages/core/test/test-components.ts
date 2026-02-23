// Test Component Stubs
// Minimal component definitions registered with the real componentRegistry.
// Used by core tests that need components registered (slotCompiler, schema, registry, etc.)
// These are simplified versions — no markdown parsing, no complex layout logic.
// Import this file for side-effect registration in core tests.

import { componentRegistry, component } from '../src/core/rendering/registry.js';
import type { ComponentNode, ExpansionContext } from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import type { SlideNode, ElementNode } from '../src/core/model/nodes.js';
import { Component, HALIGN, VALIGN, SIZE, DIRECTION, GAP } from '../src/core/model/types.js';
import type { GapSize } from '../src/core/model/types.js';
import { schema } from '../src/core/model/schema.js';

// ============================================
// TEXT (body + params, tokens)
// ============================================

componentRegistry.define({
  name: Component.Text,
  body: schema.string(),
  params: {
    style: schema.string().optional(),
    hAlign: schema.string().optional(),
    vAlign: schema.string().optional(),
    content: schema.string().optional(),
    variant: schema.string().optional(),
  },
  tokens: ['color', 'bulletColor', 'style', 'lineHeightMultiplier'],
  expand: (props: any, _ctx: ExpansionContext, tokens: any): any => ({
    type: NODE_TYPE.TEXT,
    content: [{ text: props.body }],
    style: props.style ?? tokens?.style,
    color: props.color ?? tokens?.color,
    hAlign: (props.hAlign ?? HALIGN.LEFT) as any,
    vAlign: (props.vAlign ?? VALIGN.TOP) as any,
  }),
});

export function text(body: string, options?: Record<string, unknown>): ComponentNode {
  return component(Component.Text, { body, content: 'rich', ...options });
}

// ============================================
// IMAGE (body + params)
// ============================================

componentRegistry.define({
  name: Component.Image,
  body: schema.string(),
  params: {
    alt: schema.string().optional(),
  },
  expand: (props: any): any => ({
    type: NODE_TYPE.IMAGE, src: props.body, alt: props.alt,
  }),
});

export function image(src: string, options?: { alt?: string }): ComponentNode {
  return component(Component.Image, { body: src, ...options });
}

// ============================================
// LINE (params, tokens)
// ============================================

componentRegistry.define({
  name: Component.Line,
  params: {
    variant: schema.string().optional(),
    beginArrow: schema.string().optional(),
    endArrow: schema.string().optional(),
  },
  tokens: ['color', 'width', 'dashType'],
  expand: (props: any, _ctx: ExpansionContext, tokens: any): any => ({
    type: NODE_TYPE.LINE,
    color: props.color ?? tokens.color,
    width: props.width ?? tokens.width,
    dashType: props.dashType ?? tokens.dashType,
    beginArrow: props.beginArrow,
    endArrow: props.endArrow,
  }),
});

export function line(options?: Record<string, unknown>): ComponentNode {
  return component(Component.Line, { ...options });
}

// ============================================
// SHAPE (params, tokens)
// ============================================

componentRegistry.define({
  name: Component.Shape,
  params: {
    shape: schema.string(),
    variant: schema.string().optional(),
  },
  tokens: ['fill', 'fillOpacity', 'borderColor', 'borderWidth', 'cornerRadius'],
  expand: (props: any, _ctx: ExpansionContext, tokens: any): any => ({
    type: NODE_TYPE.SHAPE,
    shape: props.shape,
    fill: {
      color: props.fill ?? tokens.fill,
      opacity: props.fillOpacity ?? tokens.fillOpacity,
    },
    border: {
      color: tokens.borderColor,
      width: tokens.borderWidth,
    },
    cornerRadius: tokens.cornerRadius,
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.FILL,
  }),
});

export function shape(options: Record<string, unknown>): ComponentNode {
  return component(Component.Shape, { ...options });
}

// ============================================
// SLIDE NUMBER (params, tokens)
// ============================================

componentRegistry.define({
  name: Component.SlideNumber,
  params: {
    variant: schema.string().optional(),
  },
  tokens: ['style', 'color', 'hAlign'],
  expand: (props: any, _ctx: ExpansionContext, tokens: any): any => ({
    type: NODE_TYPE.SLIDE_NUMBER,
    style: tokens.style,
    color: props.color ?? tokens.color,
    hAlign: props.hAlign ?? tokens.hAlign,
  }),
});

export function slideNumber(options?: Record<string, unknown>): ComponentNode {
  return component(Component.SlideNumber, { ...options });
}

// ============================================
// CARD (params, tokens)
// ============================================

componentRegistry.define({
  name: Component.Card,
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
    const titleNode = component(Component.Text, { body: props.title ?? props.body ?? '' });
    const contentColumn = component(Component.Column, { children: [titleNode], padding: tokens.padding });

    if (tokens.backgroundOpacity > 0) {
      return component(Component.Stack, {
        children: [
          component(Component.Shape, { shape: 'roundRect', fill: tokens.backgroundColor, fillOpacity: tokens.backgroundOpacity }),
          contentColumn,
        ],
      });
    }
    return contentColumn;
  },
});

export function card(options: Record<string, unknown>): ComponentNode {
  return component(Component.Card, { ...options });
}

// ============================================
// QUOTE (body + params, tokens)
// ============================================

componentRegistry.define({
  name: Component.Quote,
  body: schema.string(),
  params: {
    attribution: schema.string().optional(),
    variant: schema.string().optional(),
  },
  tokens: [
    'padding', 'cornerRadius', 'backgroundColor', 'backgroundOpacity',
    'borderColor', 'borderWidth', 'quoteStyle', 'quoteColor',
    'attributionStyle', 'attributionColor', 'attributionHAlign',
    'gap', 'hAlign', 'vAlign',
  ],
  expand: (props: any, _ctx: ExpansionContext, tokens: any): any => {
    const quoteNode = component(Component.Text, { body: props.body ?? '' });
    const contentColumn = component(Component.Column, { children: [quoteNode], padding: tokens.padding });

    if (tokens.backgroundOpacity > 0) {
      return component(Component.Stack, {
        children: [
          component(Component.Shape, { shape: 'roundRect', fill: tokens.backgroundColor, fillOpacity: tokens.backgroundOpacity }),
          contentColumn,
        ],
      });
    }
    return contentColumn;
  },
});

export function quote(options: Record<string, unknown>): ComponentNode {
  return component(Component.Quote, { body: (options as any).quote ?? '', ...options });
}

// ============================================
// TABLE (body + params, tokens)
// ============================================

componentRegistry.define({
  name: Component.Table,
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
  expand: (props: any, _ctx: ExpansionContext, tokens: any): any => ({
    type: NODE_TYPE.TABLE,
    rows: [[{ content: [{ text: 'stub' }], runs: [{ text: 'stub' }] }]],
    style: {
      borderStyle: tokens.borderStyle,
      borderColor: tokens.borderColor,
      borderWidth: tokens.borderWidth,
      cellPadding: tokens.cellPadding,
      hAlign: tokens.hAlign,
      vAlign: tokens.vAlign,
    },
  }),
});

export function table(data: string[][], options?: Record<string, unknown>): ComponentNode {
  return component(Component.Table, { body: data.map(r => `| ${r.join(' | ')} |`).join('\n'), ...options });
}

// ============================================
// MERMAID (body)
// ============================================

componentRegistry.define({
  name: Component.Mermaid,
  body: schema.string(),
  expand: (props: any): any => ({
    type: NODE_TYPE.IMAGE,
    src: 'mermaid://stub',
    alt: 'mermaid diagram',
  }),
});

// ============================================
// CONTAINERS (slots — same structure as real)
// ============================================

function parseContainerArgs(args: any[]): { props: Record<string, unknown>; children: SlideNode[] } {
  if (args[0] && typeof args[0] === 'object' && !('type' in args[0]) && !('componentName' in args[0])) {
    return { props: args[0], children: args.slice(1) };
  }
  return { props: {}, children: args };
}

// ROW
componentRegistry.define({
  name: Component.Row,
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

export function row(props: Record<string, unknown>, ...children: SlideNode[]): ComponentNode;
export function row(...children: SlideNode[]): ComponentNode;
export function row(...args: any[]): ComponentNode {
  const { props, children } = parseContainerArgs(args);
  return component(Component.Row, { ...props, children });
}

// COLUMN
componentRegistry.define({
  name: Component.Column,
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

export function column(props: Record<string, unknown>, ...children: SlideNode[]): ComponentNode;
export function column(...children: SlideNode[]): ComponentNode;
export function column(...args: any[]): ComponentNode {
  const { props, children } = parseContainerArgs(args);
  return component(Component.Column, { ...props, children });
}

// STACK
componentRegistry.define({
  name: Component.Stack,
  params: {
    width: schema.string().optional(),
    height: schema.string().optional(),
  },
  slots: ['children'] as const,
  expand: (props: any): any => ({
    type: NODE_TYPE.STACK,
    children: props.children as ElementNode[],
    width: props.width ?? SIZE.FILL,
    height: props.height ?? SIZE.HUG,
  }),
});

export function stack(props: Record<string, unknown>, ...children: SlideNode[]): ComponentNode;
export function stack(...children: SlideNode[]): ComponentNode;
export function stack(...args: any[]): ComponentNode {
  const { props, children } = parseContainerArgs(args);
  return component(Component.Stack, { ...props, children });
}

// GRID
componentRegistry.define({
  name: Component.Grid,
  params: {
    columns: schema.number(),
    gap: schema.string().optional(),
  },
  slots: ['children'] as const,
  expand: (props: any) => {
    const { columns: cols, gap: g = GAP.NORMAL, children } = props;
    const cells = children.map((child: SlideNode) => column({ width: SIZE.FILL, height: SIZE.FILL }, child));
    const rows: ComponentNode[] = [];
    for (let i = 0; i < cells.length; i += cols) {
      rows.push(row({ gap: g, height: SIZE.FILL }, ...cells.slice(i, i + cols)));
    }
    return column({ gap: g, height: SIZE.FILL }, ...rows);
  },
});

export function grid(props: { columns: number; gap?: GapSize }, ...children: SlideNode[]): ComponentNode;
export function grid(columns: number, ...children: SlideNode[]): ComponentNode;
export function grid(...args: any[]): ComponentNode {
  let columns: number;
  let gap: GapSize | undefined;
  let children: SlideNode[];
  if (typeof args[0] === 'number') {
    columns = args[0];
    children = args.slice(1);
  } else {
    columns = args[0].columns;
    gap = args[0].gap;
    children = args.slice(1);
  }
  return component(Component.Grid, { columns, gap, children });
}
