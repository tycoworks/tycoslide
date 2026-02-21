// defineComponent Tests — defineContent / defineLayout, .schema, body convention, registry compat

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  componentRegistry,
  type InferProps,
  type ComponentDefinition,
} from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { Component, HALIGN, VALIGN, SIZE } from '../src/core/types.js';
import { schema } from '../src/schema.js';

// Import components to test their .schema properties
import { proseComponent, labelComponent } from '../src/dsl/text.js';
import { imageComponent } from '../src/dsl/primitives.js';
import { mermaidComponent } from '../src/dsl/mermaid.js';
import { cardComponent } from '../src/dsl/card.js';
import { quoteComponent } from '../src/dsl/quote.js';
import '../src/dsl/containers.js';
import '../src/dsl/table.js';

describe('componentRegistry.defineContent / defineLayout', () => {
  describe('defineContent with params', () => {
    const testParams = {
      title: schema.string(),
      count: schema.number(),
      enabled: schema.boolean().optional(),
    };

    const comp = componentRegistry.defineContent({
      name: 'test-params-comp',
      params: testParams,
      tokens: [],
      expand: (props) => ({
        type: NODE_TYPE.TEXT,
        content: [{ text: props.title }],
        hAlign: HALIGN.LEFT as any,
        vAlign: VALIGN.TOP as any,
      }),
    });

    test('has .schema property (ZodObject)', () => {
      assert.ok(comp.schema);
      assert.ok(comp.schema instanceof z.ZodObject);
    });

    test('.schema validates correct data', () => {
      const result = comp.schema.safeParse({ title: 'Hi', count: 5 });
      assert.strictEqual(result.success, true);
    });

    test('.schema rejects invalid data', () => {
      const result = comp.schema.safeParse({ title: 42, count: 'bad' });
      assert.strictEqual(result.success, false);
    });

    test('.schema is usable in schema.array()', () => {
      const arr = schema.array(comp.schema);
      const result = arr.safeParse([
        { title: 'A', count: 1 },
        { title: 'B', count: 2 },
      ]);
      assert.strictEqual(result.success, true);
    });

    test('expand function works', async () => {
      const expanded = await comp.expand(
        { title: 'Hello', count: 1 },
        { theme: {} as any },
        undefined,
      );
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });

    test('auto-generates deserializer', () => {
      assert.ok(comp.deserialize, 'params component should have auto-generated deserializer');
    });

    test('is registerable in componentRegistry', () => {
      componentRegistry.register(comp);
    });
  });

  describe('defineContent with body', () => {
    const comp = componentRegistry.defineContent({
      name: 'test-body-comp',
      body: schema.string(),
      tokens: [],
      expand: (props) => ({
        type: NODE_TYPE.TEXT,
        content: [{ text: props.body }],
        hAlign: HALIGN.LEFT as any,
        vAlign: VALIGN.TOP as any,
      }),
    });

    test('has .schema property (= body type)', () => {
      assert.ok(comp.schema);
      assert.ok(comp.schema instanceof z.ZodString);
    });

    test('.schema validates correct data', () => {
      assert.strictEqual(comp.schema.safeParse('hello').success, true);
    });

    test('.schema rejects invalid data', () => {
      assert.strictEqual(comp.schema.safeParse(42).success, false);
    });

    test('.schema.optional() chaining works', () => {
      const opt = comp.schema.optional();
      assert.strictEqual(opt.safeParse(undefined).success, true);
      assert.strictEqual(opt.safeParse('hi').success, true);
    });

    test('auto-generates deserializer', () => {
      assert.ok(comp.deserialize, 'body component should have auto-generated deserializer');
    });

    test('is registerable in componentRegistry', () => {
      componentRegistry.register(comp);
    });
  });

  describe('defineContent with body + params', () => {
    const comp = componentRegistry.defineContent({
      name: 'test-body-params-comp',
      body: schema.string(),
      params: { scale: schema.number().optional() },
      tokens: [],
      expand: (props) => ({
        type: NODE_TYPE.TEXT,
        content: [{ text: props.body }],
        hAlign: HALIGN.LEFT as any,
        vAlign: VALIGN.TOP as any,
      }),
    });

    test('.schema is body type (not full object)', () => {
      assert.ok(comp.schema instanceof z.ZodString);
    });

    test('expand receives body + params', async () => {
      const expanded = await comp.expand(
        { body: 'hello', scale: 2 },
        { theme: {} as any },
        undefined,
      );
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });

  });

  describe('defineLayout (no schema)', () => {
    const comp = componentRegistry.defineLayout({
      name: 'test-prog-comp',
      tokens: [],
      expand: (props: { children: any[] }) => ({
        type: NODE_TYPE.CONTAINER,
        direction: 'row',
        children: props.children,
        width: SIZE.FILL,
        height: SIZE.HUG,
        hAlign: HALIGN.LEFT as any,
        vAlign: VALIGN.TOP as any,
      }),
    });

    test('does NOT have .schema property', () => {
      assert.strictEqual((comp as any).schema, undefined);
    });

    test('has name and expand', () => {
      assert.strictEqual(comp.name, 'test-prog-comp');
      assert.ok(typeof comp.expand === 'function');
    });

    test('does NOT have deserializer', () => {
      assert.strictEqual(comp.deserialize, undefined);
    });

    test('is registerable in componentRegistry', () => {
      componentRegistry.register(comp);
    });
  });

  describe('deserializer behavior', () => {
    test('all content components get auto-generated deserializer', () => {
      const comp = componentRegistry.defineContent({
        name: 'test-auto-deserialize',
        body: schema.string(),
        tokens: [],
        expand: (props) => ({
          type: NODE_TYPE.TEXT,
          content: [{ text: props.body }],
          hAlign: HALIGN.LEFT as any,
          vAlign: VALIGN.TOP as any,
        }),
      });
      assert.ok(comp.deserialize, 'content component should have deserializer');
    });

    test('layout components do NOT get deserializer', () => {
      const comp = componentRegistry.defineLayout({
        name: 'test-no-deserialize',
        tokens: [],
        expand: () => ({ type: NODE_TYPE.TEXT, content: [], hAlign: HALIGN.LEFT as any, vAlign: VALIGN.TOP as any }),
      });
      assert.strictEqual(comp.deserialize, undefined);
    });
  });

  describe('real component .schema properties', () => {
    test('proseComponent.schema is z.string()', () => {
      assert.ok(proseComponent.schema);
      assert.strictEqual(proseComponent.schema.safeParse('**bold**').success, true);
      assert.strictEqual(proseComponent.schema.safeParse(42).success, false);
    });

    test('labelComponent.schema is z.string()', () => {
      assert.ok(labelComponent.schema);
      assert.strictEqual(labelComponent.schema.safeParse('plain').success, true);
      assert.strictEqual(labelComponent.schema.safeParse(42).success, false);
    });

    test('imageComponent.schema is z.string()', () => {
      assert.ok(imageComponent.schema);
      assert.strictEqual(imageComponent.schema.safeParse('logo.png').success, true);
      assert.strictEqual(imageComponent.schema.safeParse(42).success, false);
    });

    test('mermaidComponent.schema is z.string()', () => {
      assert.ok(mermaidComponent.schema);
      assert.strictEqual(mermaidComponent.schema.safeParse('flowchart LR\n  A-->B').success, true);
      assert.strictEqual(mermaidComponent.schema.safeParse(42).success, false);
    });

    test('cardComponent.schema is a ZodObject (params component)', () => {
      assert.ok(cardComponent.schema);
      assert.ok(cardComponent.schema instanceof z.ZodObject);
    });

    test('cardComponent.schema validates card props', () => {
      const result = cardComponent.schema.safeParse({
        title: 'Test Card',
        description: 'A **description**',
      });
      assert.strictEqual(result.success, true);
    });

    test('quoteComponent.schema is a ZodObject (params component)', () => {
      assert.ok(quoteComponent.schema);
      assert.ok(quoteComponent.schema instanceof z.ZodObject);
    });

    test('quoteComponent.schema validates quote props', () => {
      const result = quoteComponent.schema.safeParse({
        quote: '"This changed everything."',
        attribution: '— Jane Smith',
      });
      assert.strictEqual(result.success, true);
    });
  });

  describe('component .schema in layout params', () => {
    test('proseComponent.schema usable in schema.array()', () => {
      const arr = schema.array(proseComponent.schema);
      const result = arr.safeParse(['**bold**', 'plain text']);
      assert.strictEqual(result.success, true);
    });

    test('cardComponent.schema usable in schema.array()', () => {
      const arr = schema.array(cardComponent.schema);
      const result = arr.safeParse([
        { title: 'Card 1' },
        { description: '**Bold** desc' },
      ]);
      assert.strictEqual(result.success, true);
    });

    test('mixed component schemas in layout params object', () => {
      const layoutParams = z.object({
        title: proseComponent.schema,
        eyebrow: labelComponent.schema.optional(),
        logo: imageComponent.schema.optional(),
        cards: schema.array(cardComponent.schema),
      });

      const result = layoutParams.safeParse({
        title: '**Welcome**',
        logo: 'logo.png',
        cards: [{ title: 'Card 1' }],
      });
      assert.strictEqual(result.success, true);
    });
  });
});
