// Schema Module Tests

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { schema } from '../src/core/model/schema.js';
import { layoutRegistry } from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import { compileSlot } from '../src/core/markdown/slotCompiler.js';
import { C } from './test-components.js';

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
      const result = compileSlot(':::text\nHello world\n:::');
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
      assert.strictEqual((result[0] as any).componentName, C.Text);
    });

    it('compiles multiple directives', () => {
      const result = compileSlot(':::text\nText\n:::\n\n:::image\npic.png\n:::');
      assert.strictEqual(result.length, 2);
      assert.strictEqual((result[0] as any).componentName, C.Text);
      assert.strictEqual((result[1] as any).componentName, C.Image);
    });

    it('empty string → empty array', () => {
      const result = compileSlot('');
      assert.strictEqual(result.length, 0);
    });

    it('compiles bare MDAST inline to text node', () => {
      const result = compileSlot('Hello world');
      assert.strictEqual(result.length, 1);
      assert.strictEqual((result[0] as any).componentName, C.Text);
    });
  });

  describe('ScalarParam constraint (params rejects non-scalar types)', () => {
    it('rejects z.custom() in layout params', () => {
      const dummy = { type: NODE_TYPE.COMPONENT, componentName: 'x', props: {} } as const;
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
      const dummy = { type: NODE_TYPE.COMPONENT, componentName: 'x', props: {} } as const;
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
