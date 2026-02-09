// Rich Text Tests
// Test paragraph-level options (bold, italic, breakLine, bullet, paraSpaceBefore, paraSpaceAfter)

import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { text } from '../src/core/dsl.js';
import { TEXT_STYLE, FONT_WEIGHT } from '../src/core/types.js';
import type { NormalizedRun } from '../src/core/types.js';
import { normalizeContent } from '../src/utils/text.js';

describe('Rich Text', () => {
  describe('NormalizedRun paragraph options', () => {
    it('should accept bold option', () => {
      const runs: NormalizedRun[] = [
        { text: 'Bold text', bold: true },
      ];
      assert.strictEqual(runs[0].bold, true);
    });

    it('should accept italic option', () => {
      const runs: NormalizedRun[] = [
        { text: 'Italic text', italic: true },
      ];
      assert.strictEqual(runs[0].italic, true);
    });

    it('should accept breakLine option', () => {
      const runs: NormalizedRun[] = [
        { text: 'New paragraph', breakLine: true },
      ];
      assert.strictEqual(runs[0].breakLine, true);
    });

    it('should accept bullet as boolean', () => {
      const runs: NormalizedRun[] = [
        { text: 'Bullet item', bullet: true },
      ];
      assert.strictEqual(runs[0].bullet, true);
    });

    it('should accept bullet as object with color', () => {
      const runs: NormalizedRun[] = [
        { text: 'Colored bullet', bullet: { color: 'FF0000' } },
      ];
      assert.deepStrictEqual(runs[0].bullet, { color: 'FF0000' });
    });

    it('should accept paraSpaceBefore', () => {
      const runs: NormalizedRun[] = [
        { text: 'Spaced paragraph', paraSpaceBefore: 12 },
      ];
      assert.strictEqual(runs[0].paraSpaceBefore, 12);
    });

    it('should accept paraSpaceAfter', () => {
      const runs: NormalizedRun[] = [
        { text: 'Spaced paragraph', paraSpaceAfter: 6 },
      ];
      assert.strictEqual(runs[0].paraSpaceAfter, 6);
    });

    it('should combine multiple paragraph options', () => {
      const runs: NormalizedRun[] = [
        {
          text: 'Complex run',
          bold: true,
          italic: true,
          breakLine: true,
          bullet: true,
          paraSpaceBefore: 6,
          paraSpaceAfter: 12,
        },
      ];
      assert.strictEqual(runs[0].bold, true);
      assert.strictEqual(runs[0].italic, true);
      assert.strictEqual(runs[0].breakLine, true);
      assert.strictEqual(runs[0].bullet, true);
      assert.strictEqual(runs[0].paraSpaceBefore, 6);
      assert.strictEqual(runs[0].paraSpaceAfter, 12);
    });
  });

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

    it('should create TextNode with paragraph spacing', () => {
      const node = text([
        { text: 'Header', bold: true, paraSpaceAfter: 6 },
        { text: 'Body text', breakLine: true, paraSpaceBefore: 12 },
      ]);
      if (Array.isArray(node.content)) {
        const headerRun = node.content[0] as NormalizedRun;
        const bodyRun = node.content[1] as NormalizedRun;
        assert.strictEqual(headerRun.paraSpaceAfter, 6);
        assert.strictEqual(bodyRun.paraSpaceBefore, 12);
      }
    });
  });

  describe('normalizeContent with rich runs', () => {
    it('should preserve bold option', () => {
      const content: NormalizedRun[] = [
        { text: 'Bold text', bold: true },
      ];
      const normalized = normalizeContent(content);
      assert.strictEqual(normalized[0].bold, true);
    });

    it('should preserve italic option', () => {
      const content: NormalizedRun[] = [
        { text: 'Italic text', italic: true },
      ];
      const normalized = normalizeContent(content);
      assert.strictEqual(normalized[0].italic, true);
    });

    it('should preserve breakLine option', () => {
      const content: NormalizedRun[] = [
        { text: 'New paragraph', breakLine: true },
      ];
      const normalized = normalizeContent(content);
      assert.strictEqual(normalized[0].breakLine, true);
    });

    it('should preserve bullet option', () => {
      const content: NormalizedRun[] = [
        { text: 'Bullet', bullet: true },
      ];
      const normalized = normalizeContent(content);
      assert.strictEqual(normalized[0].bullet, true);
    });

    it('should preserve paraSpaceBefore option', () => {
      const content: NormalizedRun[] = [
        { text: 'Spaced', paraSpaceBefore: 12 },
      ];
      const normalized = normalizeContent(content);
      assert.strictEqual(normalized[0].paraSpaceBefore, 12);
    });

    it('should preserve paraSpaceAfter option', () => {
      const content: NormalizedRun[] = [
        { text: 'Spaced', paraSpaceAfter: 6 },
      ];
      const normalized = normalizeContent(content);
      assert.strictEqual(normalized[0].paraSpaceAfter, 6);
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
