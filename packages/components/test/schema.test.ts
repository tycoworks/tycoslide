// Component Schema Tests
// Tests that real component .schema properties work correctly with Zod
// Moved from core/test/defineComponent.test.ts — these test component schemas, not the define() API

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { schema } from 'tycoslide';
import { proseComponent, labelComponent } from '../src/text.js';
import { imageComponent } from '../src/image.js';
import { mermaidComponent } from '../src/mermaid.js';
import { cardComponent } from '../src/card.js';
import { quoteComponent } from '../src/quote.js';

describe('Component .schema properties', () => {
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
