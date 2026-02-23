// Test Component Stubs
// Minimal component definitions registered with the real componentRegistry.
// Used by core tests that need components registered (slotCompiler, schema, registry, etc.)
//
// Only Text, Card, Row, Column have real expand functions (needed by registry.test.ts).
// Everything else registers metadata only — slotCompiler never calls expand.
//
// Import this file for side-effect registration in core tests.

import { componentRegistry, component } from '../src/core/rendering/registry.js';
import type { ExpansionContext } from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import type { ElementNode } from '../src/core/model/nodes.js';
import { Component, HALIGN, VALIGN, SIZE, DIRECTION } from '../src/core/model/types.js';
import { schema } from '../src/core/model/schema.js';

// ============================================
// TEXT (real expand — used by registry.test.ts)
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

// ============================================
// ROW (real expand — used by registry.test.ts)
// ============================================

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

// ============================================
// COLUMN (real expand — used by registry.test.ts via Card)
// ============================================

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

// ============================================
// CARD (real expand — used by registry.test.ts)
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

// ============================================
// METADATA-ONLY STUBS (slotCompiler needs registration, not expand)
// ============================================

componentRegistry.define({
  name: Component.Image,
  body: schema.string(),
  params: { alt: schema.string().optional() },
  expand: () => ({}) as any,
});

componentRegistry.define({
  name: Component.Line,
  params: {
    variant: schema.string().optional(),
    beginArrow: schema.string().optional(),
    endArrow: schema.string().optional(),
  },
  tokens: ['color', 'width', 'dashType'],
  expand: () => ({}) as any,
});

componentRegistry.define({
  name: Component.Shape,
  params: {
    shape: schema.string(),
    variant: schema.string().optional(),
  },
  tokens: ['fill', 'fillOpacity', 'borderColor', 'borderWidth', 'cornerRadius'],
  expand: () => ({}) as any,
});

componentRegistry.define({
  name: Component.SlideNumber,
  params: { variant: schema.string().optional() },
  tokens: ['style', 'color', 'hAlign'],
  expand: () => ({}) as any,
});

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
  expand: () => ({}) as any,
});

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
  expand: () => ({}) as any,
});

componentRegistry.define({
  name: Component.Mermaid,
  body: schema.string(),
  expand: () => ({}) as any,
});

componentRegistry.define({
  name: Component.Stack,
  params: {
    width: schema.string().optional(),
    height: schema.string().optional(),
  },
  slots: ['children'] as const,
  expand: () => ({}) as any,
});

componentRegistry.define({
  name: Component.Grid,
  params: {
    columns: schema.number(),
    gap: schema.string().optional(),
  },
  slots: ['children'] as const,
  expand: () => ({}) as any,
});
