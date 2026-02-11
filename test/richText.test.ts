// Rich Text Tests
// Test paragraph-level options flow through DSL and pptxgenjs compatibility

import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { text } from '../src/core/dsl.js';
import type { NormalizedRun } from '../src/core/types.js';
import { normalizeContent } from '../src/utils/text.js';

describe('Rich Text', () => {
  describe('text() DSL with rich runs', () => {
    it('should create TextNode with bold runs', () => {
      const node = text([
        { text: 'Normal ', },
        { text: 'Bold', bold: true },
      ]);
      assert.strictEqual(node.type, 'text');
      assert.strictEqual(Array.isArray(node.content), true);
      if (Array.isArray(node.content)) {
        assert.strictEqual(node.content.length, 2);
        const secondRun = node.content[1] as NormalizedRun;
        assert.strictEqual(secondRun.bold, true);
      }
    });

    it('should create TextNode with bullet runs', () => {
      const node = text([
        { text: 'First bullet', bullet: true },
        { text: 'Second bullet', breakLine: true, bullet: true },
      ]);
      assert.strictEqual(node.type, 'text');
      if (Array.isArray(node.content)) {
        const firstRun = node.content[0] as NormalizedRun;
        const secondRun = node.content[1] as NormalizedRun;
        assert.strictEqual(firstRun.bullet, true);
        assert.strictEqual(secondRun.bullet, true);
        assert.strictEqual(secondRun.breakLine, true);
      }
    });

  });

  describe('pptxgenjs compatibility', () => {
    it('should document that bullet: true auto-creates line breaks', () => {
      // pptxgenjs quirk: bullet: true automatically creates line breaks
      // Users should NOT combine breakLine: true with bullet: true
      // The text handler strips breakLine when bullet is present
      const content: NormalizedRun[] = [
        { text: 'Header', bold: true },
        { text: 'First bullet', bullet: true },
        { text: 'Second bullet', bullet: true },  // No breakLine needed
        { text: 'Third bullet', bullet: true },
      ];
      const normalized = normalizeContent(content);
      // All runs preserved - stripping happens in buildTextFragments
      assert.strictEqual(normalized.length, 4);
      assert.strictEqual(normalized[1].bullet, true);
      assert.strictEqual(normalized[2].bullet, true);
      assert.strictEqual(normalized[3].bullet, true);
    });

    it('should allow breakLine without bullet for plain paragraphs', () => {
      // breakLine is valid for non-bullet content (e.g., paragraph breaks)
      const content: NormalizedRun[] = [
        { text: 'First paragraph\n' },
        { text: 'Second paragraph', breakLine: true },
      ];
      const normalized = normalizeContent(content);
      assert.strictEqual(normalized[1].breakLine, true);
      assert.strictEqual(normalized[1].bullet, undefined);
    });
  });
});
