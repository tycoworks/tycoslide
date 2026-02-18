// Schema Module Tests

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { schema } from '../src/schema.js';
import { layoutRegistry, COMPONENT_TYPE } from '../src/core/registry.js';
import { BLOCK_COMPONENT } from '../src/dsl/block.js';
import { IMAGE_COMPONENT } from '../src/dsl/primitives.js';

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

  describe('slot content transform', () => {
    it('schema.slot() compiles directive to ComponentNode[]', () => {
      const s = z.object({ body: schema.slot() });
      const result = s.safeParse({ body: ':::block\nHello world\n:::' });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.ok(Array.isArray(result.data.body));
        assert.strictEqual(result.data.body.length, 1);
        assert.strictEqual(result.data.body[0].componentName, BLOCK_COMPONENT);
      }
    });

    it('schema.slot() compiles multiple directives', () => {
      const s = z.object({ body: schema.slot() });
      const result = s.safeParse({ body: ':::block\nText\n:::\n\n:::image\npic.png\n:::' });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.body.length, 2);
        assert.strictEqual(result.data.body[0].componentName, BLOCK_COMPONENT);
        assert.strictEqual(result.data.body[1].componentName, IMAGE_COMPONENT);
      }
    });

    it('schema.slot() empty string → empty array', () => {
      const s = z.object({ body: schema.slot() });
      const result = s.safeParse({ body: '' });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.body.length, 0);
      }
    });

    it('schema.slot() rejects non-string input', () => {
      const s = z.object({ body: schema.slot() });
      assert.strictEqual(s.safeParse({ body: 42 }).success, false);
    });

    it('schema.slot() auto-wraps bare MDAST in default component', () => {
      const s = z.object({ body: schema.slot() });
      const result = s.safeParse({ body: 'Hello world' });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.body.length, 1);
        assert.strictEqual(result.data.body[0].componentName, BLOCK_COMPONENT);
      }
    });
  });

  describe('MarkdownParam constraint', () => {
    it('rejects z.custom() in layout params', () => {
      const dummy = { type: COMPONENT_TYPE, componentName: 'x', props: {} } as const;
      // Type-level test: z.custom() should not be assignable to MarkdownParam.
      // If this @ts-expect-error becomes "unused", the constraint was loosened.
      layoutRegistry.define({
        name: 'test-bad-custom',
        description: 'should not compile',
        params: {
          // @ts-expect-error: z.custom() is not a MarkdownParam
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
          // @ts-expect-error: z.any() is not a MarkdownParam
          data: z.any(),
        },
        render: () => ({ content: dummy }),
      });
    });
  });
});
