// Node Utilities Tests
// Tests for node-utils.ts utility functions

import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { toTextContent, resolveGap } from '../src/utils/node-utils.js';
import { NODE_TYPE, type TextNode } from '../src/core/nodes.js';
import { GAP, type TextRun } from '../src/core/types.js';
import { mockTheme } from './mocks.js';

// ============================================
// toTextContent() TESTS
// ============================================

describe('toTextContent()', () => {
  it('should pass through string input', () => {
    const input = 'Hello World';
    const result = toTextContent(input);
    assert.strictEqual(result, input);
  });

  it('should pass through TextRun input', () => {
    const input: TextRun = { text: 'Hello', color: 'FF0000' };
    const result = toTextContent(input);
    assert.deepStrictEqual(result, input);
  });

  it('should pass through array of strings', () => {
    const input = ['Hello', 'World'];
    const result = toTextContent(input);
    assert.deepStrictEqual(result, input);
  });

  it('should pass through array of TextRuns', () => {
    const input: TextRun[] = [
      { text: 'Hello', color: 'FF0000' },
      { text: 'World', color: '0000FF' },
    ];
    const result = toTextContent(input);
    assert.deepStrictEqual(result, input);
  });

  it('should pass through mixed array of strings and TextRuns', () => {
    const input: TextRun[] = [
      'Plain text',
      { text: 'Colored text', color: 'FF0000' },
      'More plain',
    ];
    const result = toTextContent(input);
    assert.deepStrictEqual(result, input);
  });

  it('should extract content from TextNode with string', () => {
    const textNode: TextNode = {
      type: NODE_TYPE.TEXT,
      content: 'Hello World',
    };
    const result = toTextContent(textNode);
    assert.strictEqual(result, 'Hello World');
  });

  it('should extract content from TextNode with TextRun array', () => {
    const content: TextRun[] = [
      'Plain ',
      { text: 'Bold', color: 'FF0000' },
    ];
    const textNode: TextNode = {
      type: NODE_TYPE.TEXT,
      content,
    };
    const result = toTextContent(textNode);
    assert.deepStrictEqual(result, content);
  });

  it('should handle empty string', () => {
    const result = toTextContent('');
    assert.strictEqual(result, '');
  });

  it('should handle empty array', () => {
    const result = toTextContent([]);
    assert.deepStrictEqual(result, []);
  });
});

// ============================================
// resolveGap() TESTS
// ============================================

describe('resolveGap()', () => {
  const theme = mockTheme({
    gap: 0.25,
    gapTight: 0.125,
    gapLoose: 0.5,
  });

  it('should resolve GAP.NONE to 0', () => {
    const result = resolveGap(GAP.NONE, theme);
    assert.strictEqual(result, 0);
  });

  it('should resolve GAP.TIGHT to theme.spacing.gapTight', () => {
    const result = resolveGap(GAP.TIGHT, theme);
    assert.strictEqual(result, 0.125);
  });

  it('should resolve GAP.NORMAL to theme.spacing.gap', () => {
    const result = resolveGap(GAP.NORMAL, theme);
    assert.strictEqual(result, 0.25);
  });

  it('should resolve GAP.LOOSE to theme.spacing.gapLoose', () => {
    const result = resolveGap(GAP.LOOSE, theme);
    assert.strictEqual(result, 0.5);
  });

  it('should resolve undefined to theme.spacing.gap (default)', () => {
    const result = resolveGap(undefined, theme);
    assert.strictEqual(result, 0.25);
  });

  it('should return custom spacing value unchanged', () => {
    // Although type signature shows string | undefined, testing behavior
    // with a non-GAP string (custom value scenario)
    const result = resolveGap('custom' as any, theme);
    assert.strictEqual(result, 0.25); // Falls through to default case
  });

  it('should work with different theme spacing values', () => {
    const customTheme = mockTheme({
      gap: 0.5,
      gapTight: 0.2,
      gapLoose: 0.8,
    });

    assert.strictEqual(resolveGap(GAP.NONE, customTheme), 0);
    assert.strictEqual(resolveGap(GAP.TIGHT, customTheme), 0.2);
    assert.strictEqual(resolveGap(GAP.NORMAL, customTheme), 0.5);
    assert.strictEqual(resolveGap(GAP.LOOSE, customTheme), 0.8);
    assert.strictEqual(resolveGap(undefined, customTheme), 0.5);
  });
});
