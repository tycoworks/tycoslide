// Layout validation tests
// Verify Zod schema validation via validateLayoutProps()

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { validateLayoutProps, type LayoutDefinition } from '../src/core/registry.js';

// Create a test layout with a known schema
const testSchema = z.object({
  title: z.string(),
  count: z.number().int().positive(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

const testLayout: LayoutDefinition<z.infer<typeof testSchema>> = {
  name: 'test',
  description: 'Test layout for validation',
  schema: testSchema,
  render: (props) => ({ content: { type: 'component' as const, componentName: 'test', props: { text: props.title } } }),
};

describe('validateLayoutProps', () => {
  it('should return validated props for valid input', () => {
    const result = validateLayoutProps(testLayout, { title: 'Hello', count: 5 });
    assert.strictEqual(result.title, 'Hello');
    assert.strictEqual(result.count, 5);
  });

  it('should accept optional fields when present', () => {
    const result = validateLayoutProps(testLayout, {
      title: 'Hello',
      count: 3,
      tags: ['a', 'b'],
      active: true,
    });
    assert.deepStrictEqual(result.tags, ['a', 'b']);
    assert.strictEqual(result.active, true);
  });

  it('should accept optional fields when absent', () => {
    const result = validateLayoutProps(testLayout, { title: 'Hello', count: 1 });
    assert.strictEqual(result.tags, undefined);
    assert.strictEqual(result.active, undefined);
  });

  it('should throw on missing required field', () => {
    assert.throws(
      () => validateLayoutProps(testLayout, { count: 5 }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("Layout 'test' validation failed"));
        assert.ok(err.message.includes('title'));
        return true;
      },
    );
  });

  it('should throw on wrong type', () => {
    assert.throws(
      () => validateLayoutProps(testLayout, { title: 'Hello', count: 'not a number' }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('count'));
        return true;
      },
    );
  });

  it('should throw on negative number when positive required', () => {
    assert.throws(
      () => validateLayoutProps(testLayout, { title: 'Hello', count: -1 }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('count'));
        return true;
      },
    );
  });

  it('should throw on invalid array element type', () => {
    assert.throws(
      () => validateLayoutProps(testLayout, { title: 'Hello', count: 1, tags: [123] }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('tags'));
        return true;
      },
    );
  });

  it('should include layout name in error message', () => {
    assert.throws(
      () => validateLayoutProps(testLayout, {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("'test'"));
        return true;
      },
    );
  });

  it('should strip unknown fields via Zod passthrough behavior', () => {
    // By default z.object is strict about output but allows extra input keys
    const result = validateLayoutProps(testLayout, {
      title: 'Hello',
      count: 1,
      unknownField: 'should be stripped',
    });
    assert.strictEqual(result.title, 'Hello');
    assert.strictEqual((result as any).unknownField, undefined);
  });
});

describe('validateLayoutProps with enum schema', () => {
  const enumSchema = z.object({
    style: z.enum(['h1', 'h2', 'h3', 'body'] as [string, ...string[]]),
  });
  const enumLayout: LayoutDefinition<z.infer<typeof enumSchema>> = {
    name: 'enumTest',
    description: 'Test enum validation',
    schema: enumSchema,
    render: (props) => ({ content: { type: 'component' as const, componentName: 'test', props: { style: props.style } } }),
  };

  it('should accept valid enum value', () => {
    const result = validateLayoutProps(enumLayout, { style: 'h1' });
    assert.strictEqual(result.style, 'h1');
  });

  it('should reject invalid enum value', () => {
    assert.throws(
      () => validateLayoutProps(enumLayout, { style: 'h99' }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('style'));
        return true;
      },
    );
  });
});
