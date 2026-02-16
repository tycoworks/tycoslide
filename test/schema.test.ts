// Schema Module Tests

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { schema } from '../src/schema.js';
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
});
