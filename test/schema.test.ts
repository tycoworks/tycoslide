// Schema Module Tests

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { schema } from '../src/schema.js';
import { layoutRegistry, COMPONENT_TYPE } from '../src/core/registry.js';
import { Component } from '../src/core/types.js';
import { compileSlot } from '../src/markdown/slotCompiler.js';
import '../src/dsl/document.js';
import '../src/dsl/primitives.js';

describe('schema', () => {
  describe('scalar types', () => {
    it('schema.string() passes string, rejects number', () => {
      const s = schema.string();
      assert.strictEqual(s.safeParse('hello').success, true);
      assert.strictEqual(s.safeParse(42).success, false);
    });

    it('schema.string().optional() chaining works', () => {
      const s = schema.string().optional();
      assert.strictEqual(s.safeParse('hello').success, true);
      assert.strictEqual(s.safeParse(undefined).success, true);
      assert.strictEqual(s.safeParse(42).success, false);
    });

    it('schema.number() passes number, rejects string', () => {
      const s = schema.number();
      assert.strictEqual(s.safeParse(42).success, true);
      assert.strictEqual(s.safeParse('hello').success, false);
    });

    it('schema.boolean() passes boolean, rejects string', () => {
      const s = schema.boolean();
      assert.strictEqual(s.safeParse(true).success, true);
      assert.strictEqual(s.safeParse('hello').success, false);
    });

    it('schema.enum() validates against values', () => {
      const s = schema.enum(['a', 'b', 'c']);
      assert.strictEqual(s.safeParse('a').success, true);
      assert.strictEqual(s.safeParse('d').success, false);
    });

    it('schema.array() validates array items', () => {
      const s = schema.array(schema.string());
      assert.strictEqual(s.safeParse(['a', 'b']).success, true);
      assert.strictEqual(s.safeParse([1, 2]).success, false);
    });
  });

  describe('compileSlot', () => {
    it('compiles directive to ComponentNode[]', () => {
      const result = compileSlot(':::document\nHello world\n:::');
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].componentName, Component.Document);
    });

    it('compiles multiple directives', () => {
      const result = compileSlot(':::document\nText\n:::\n\n:::image\npic.png\n:::');
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].componentName, Component.Document);
      assert.strictEqual(result[1].componentName, Component.Image);
    });

    it('empty string → empty array', () => {
      const result = compileSlot('');
      assert.strictEqual(result.length, 0);
    });

    it('auto-wraps bare MDAST in default component', () => {
      const result = compileSlot('Hello world');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].componentName, Component.Document);
    });
  });

  describe('ScalarParam constraint (params rejects non-scalar types)', () => {
    it('rejects z.custom() in layout params', () => {
      const dummy = { type: COMPONENT_TYPE, componentName: 'x', props: {} } as const;
      // Type-level test: z.custom() should not be assignable to ScalarParam.
      // If this @ts-expect-error becomes "unused", the constraint was loosened.
      layoutRegistry.define({
        name: 'test-bad-custom',
        description: 'should not compile',
        params: {
          // @ts-expect-error: z.custom() is not a ScalarParam
          content: z.custom<string[]>(),
        },
        render: () => ({ content: dummy }),
      });
    });

    it('rejects z.any() in layout params', () => {
      const dummy = { type: COMPONENT_TYPE, componentName: 'x', props: {} } as const;
      layoutRegistry.define({
        name: 'test-bad-any',
        description: 'should not compile',
        params: {
          // @ts-expect-error: z.any() is not a ScalarParam
          data: z.any(),
        },
        render: () => ({ content: dummy }),
      });
    });
  });

});
