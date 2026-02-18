// Schema Module Tests

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { schema } from '../src/schema.js';
import { layoutRegistry, COMPONENT_TYPE } from '../src/core/registry.js';
import { MARKDOWN_COMPONENT } from '../src/dsl/text.js';

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

  describe('block content transform', () => {
    it('schema.block() transforms string to ComponentNode[]', () => {
      const s = z.object({ body: schema.block() });
      const result = s.safeParse({ body: 'Hello world' });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.ok(Array.isArray(result.data.body));
        assert.strictEqual(result.data.body.length, 1);
        assert.strictEqual(result.data.body[0].componentName, MARKDOWN_COMPONENT);
      }
    });

    it('schema.block() preserves block structure', () => {
      const s = z.object({ body: schema.block() });
      const result = s.safeParse({ body: '## Heading\n\nParagraph text.' });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.body.length, 2);
      }
    });

    it('schema.block() empty string → empty array', () => {
      const s = z.object({ body: schema.block() });
      const result = s.safeParse({ body: '' });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.body.length, 0);
      }
    });

    it('schema.block() rejects non-string input', () => {
      const s = z.object({ body: schema.block() });
      assert.strictEqual(s.safeParse({ body: 42 }).success, false);
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
