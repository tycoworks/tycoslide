// defineComponent Tests — define(), .schema, body convention, registry compat

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  componentRegistry,
  defineComponent,
  type ComponentDefinition,
} from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import { HALIGN, VALIGN, SIZE, DIRECTION, TEXT_STYLE, FONT_WEIGHT } from '../src/core/model/types.js';
import type { TextStyle } from '../src/core/model/types.js';
import { schema } from '../src/core/model/schema.js';

const stubStyle: TextStyle = { fontSize: 12, fontFamily: { normal: { name: 'Test', path: '' } }, defaultWeight: FONT_WEIGHT.NORMAL, lineHeightMultiplier: 1.0, bulletIndentPt: 18 };

const stubTextNode = (text: string = ''): any => ({
  type: NODE_TYPE.TEXT,
  content: [{ text }],
  style: TEXT_STYLE.BODY,
  resolvedStyle: stubStyle,
  color: '#000000',
  hAlign: HALIGN.LEFT,
  vAlign: VALIGN.TOP,
  lineHeightMultiplier: 1.2,
  bulletIndentPt: 0,
  linkColor: '#0000FF',
  linkUnderline: true,
});

describe('defineComponent', () => {
  describe('define with params', () => {
    const testParams = {
      title: schema.string(),
      count: schema.number(),
      enabled: schema.boolean().optional(),
    };

    const comp = defineComponent({
      name: 'test-params-comp',
      params: testParams,
      tokens: [],
      expand: (props) => stubTextNode(props.title),
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
        { theme: {} as any, canvas: { renderHtml: async () => '' } },
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

  describe('define with body', () => {
    const comp = defineComponent({
      name: 'test-body-comp',
      body: schema.string(),
      tokens: [],
      expand: (props) => stubTextNode(props.body),
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

  describe('define with body + params', () => {
    const comp = defineComponent({
      name: 'test-body-params-comp',
      body: schema.string(),
      params: { scale: schema.number().optional() },
      tokens: [],
      expand: (props) => stubTextNode(props.body),
    });

    test('.schema is body type (not full object)', () => {
      assert.ok(comp.schema instanceof z.ZodString);
    });

    test('expand receives body + params', async () => {
      const expanded = await comp.expand(
        { body: 'hello', scale: 2 },
        { theme: {} as any, canvas: { renderHtml: async () => '' } },
        undefined,
      );
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });

  });

  describe('define with slots (no schema)', () => {
    const comp = defineComponent({
      name: 'test-prog-comp',
      slots: ['children'],
      tokens: [],
      expand: (props: { children: any[] }) => ({
        type: NODE_TYPE.CONTAINER,
        direction: DIRECTION.ROW,
        children: props.children,
        width: SIZE.FILL,
        height: SIZE.HUG,
        gap: 0,
        hAlign: HALIGN.LEFT,
        vAlign: VALIGN.TOP,
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

});
