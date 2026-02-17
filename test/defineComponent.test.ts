// defineComponent Tests — all 3 overloads, .input, InferProps, registry compat

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  componentRegistry,
  type InferProps,
  type ParamsComponentDefinition,
  type InputComponentDefinition,
  type ComponentDefinition,
} from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { schema } from '../src/schema.js';

// Import components to test their .input properties
import { markdownComponent, textComponent } from '../src/dsl/text.js';
import { imageComponent } from '../src/dsl/primitives.js';
import { mermaidComponent } from '../src/dsl/diagram.js';
import { cardComponent } from '../src/dsl/card.js';
import { quoteComponent } from '../src/dsl/quote.js';

describe('componentRegistry.define', () => {
  describe('overload 1: params component', () => {
    const testParams = {
      title: schema.string(),
      count: schema.number(),
      enabled: schema.boolean().optional(),
    };

    const comp = componentRegistry.define({
      name: 'test-params-comp',
      params: testParams,
      expand: (props) => ({
        type: NODE_TYPE.TEXT,
        content: [{ text: props.title }],
        hAlign: 'left' as any,
        vAlign: 'top' as any,
      }),
    });

    test('has .input property (ZodObject)', () => {
      assert.ok(comp.input);
      assert.ok(comp.input instanceof z.ZodObject);
    });

    test('does NOT have .schema property', () => {
      assert.strictEqual((comp as any).schema, undefined);
    });

    test('.input validates correct data', () => {
      const result = comp.input.safeParse({ title: 'Hi', count: 5 });
      assert.strictEqual(result.success, true);
    });

    test('.input rejects invalid data', () => {
      const result = comp.input.safeParse({ title: 42, count: 'bad' });
      assert.strictEqual(result.success, false);
    });

    test('.input is usable in schema.array()', () => {
      const arr = schema.array(comp.input);
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

    test('is registerable in componentRegistry', () => {
      componentRegistry.register(comp);
    });
  });

  describe('overload 2: input component (simple input type)', () => {
    const comp = componentRegistry.define({
      name: 'test-input-comp',
      input: schema.string(),
      expand: (props: { content: string }) => ({
        type: NODE_TYPE.TEXT,
        content: [{ text: props.content }],
        hAlign: 'left' as any,
        vAlign: 'top' as any,
      }),
    });

    test('has .input property', () => {
      assert.ok(comp.input);
      assert.ok(comp.input instanceof z.ZodString);
    });

    test('does NOT have .schema property', () => {
      assert.strictEqual((comp as any).schema, undefined);
    });

    test('.input validates correct data', () => {
      assert.strictEqual(comp.input.safeParse('hello').success, true);
    });

    test('.input rejects invalid data', () => {
      assert.strictEqual(comp.input.safeParse(42).success, false);
    });

    test('.input.optional() chaining works', () => {
      const opt = comp.input.optional();
      assert.strictEqual(opt.safeParse(undefined).success, true);
      assert.strictEqual(opt.safeParse('hi').success, true);
    });

    test('is registerable in componentRegistry', () => {
      componentRegistry.register(comp);
    });
  });

  describe('overload 3: programmatic-only (no input/params)', () => {
    const comp = componentRegistry.define({
      name: 'test-prog-comp',
      expand: (props: { children: any[] }) => ({
        type: NODE_TYPE.CONTAINER,
        direction: 'row',
        children: props.children,
        hAlign: 'left' as any,
        vAlign: 'top' as any,
      }),
    });

    test('does NOT have .input property', () => {
      assert.strictEqual((comp as any).input, undefined);
    });

    test('does NOT have .schema property', () => {
      assert.strictEqual((comp as any).schema, undefined);
    });

    test('has name and expand', () => {
      assert.strictEqual(comp.name, 'test-prog-comp');
      assert.ok(typeof comp.expand === 'function');
    });

    test('is registerable in componentRegistry', () => {
      componentRegistry.register(comp);
    });
  });

  describe('runtime guard', () => {
    test('throws when both params and input are provided', () => {
      assert.throws(
        () => componentRegistry.define({
          name: 'ambiguous',
          params: { title: schema.string() },
          input: schema.string(),
          expand: () => ({ type: NODE_TYPE.TEXT, content: [], hAlign: 'left' as any, vAlign: 'top' as any }),
        } as any),
        /cannot specify both 'params' and 'input'/,
      );
    });
  });

  describe('real component .input properties', () => {
    test('markdownComponent.input is z.string()', () => {
      assert.ok(markdownComponent.input);
      assert.strictEqual(markdownComponent.input.safeParse('**bold**').success, true);
      assert.strictEqual(markdownComponent.input.safeParse(42).success, false);
    });

    test('textComponent.input is z.string()', () => {
      assert.ok(textComponent.input);
      assert.strictEqual(textComponent.input.safeParse('plain').success, true);
      assert.strictEqual(textComponent.input.safeParse(42).success, false);
    });

    test('imageComponent.input is z.string()', () => {
      assert.ok(imageComponent.input);
      assert.strictEqual(imageComponent.input.safeParse('logo.png').success, true);
      assert.strictEqual(imageComponent.input.safeParse(42).success, false);
    });

    test('mermaidComponent.input is z.string()', () => {
      assert.ok(mermaidComponent.input);
      assert.strictEqual(mermaidComponent.input.safeParse('flowchart LR\n  A-->B').success, true);
      assert.strictEqual(mermaidComponent.input.safeParse(42).success, false);
    });

    test('cardComponent.input is a ZodObject (params component)', () => {
      assert.ok(cardComponent.input);
      assert.ok(cardComponent.input instanceof z.ZodObject);
    });

    test('cardComponent.input validates card props', () => {
      const result = cardComponent.input.safeParse({
        title: 'Test Card',
        description: 'A **description**',
      });
      assert.strictEqual(result.success, true);
    });

    test('quoteComponent.input is a ZodObject (params component)', () => {
      assert.ok(quoteComponent.input);
      assert.ok(quoteComponent.input instanceof z.ZodObject);
    });

    test('quoteComponent.input validates quote props', () => {
      const result = quoteComponent.input.safeParse({
        quote: '"This changed everything."',
        attribution: '— Jane Smith',
      });
      assert.strictEqual(result.success, true);
    });
  });

  describe('component .input in layout params', () => {
    test('markdownComponent.input usable in schema.array()', () => {
      const arr = schema.array(markdownComponent.input);
      const result = arr.safeParse(['**bold**', 'plain text']);
      assert.strictEqual(result.success, true);
    });

    test('cardComponent.input usable in schema.array()', () => {
      const arr = schema.array(cardComponent.input);
      const result = arr.safeParse([
        { title: 'Card 1' },
        { description: '**Bold** desc' },
      ]);
      assert.strictEqual(result.success, true);
    });

    test('mixed component inputs in layout params object', () => {
      const layoutParams = z.object({
        title: markdownComponent.input,
        eyebrow: textComponent.input.optional(),
        logo: imageComponent.input.optional(),
        cards: schema.array(cardComponent.input),
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
