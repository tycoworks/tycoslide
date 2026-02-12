// normalizeContent() Tests
// Tests for the normalizeContent utility function from src/utils/text.ts
// This function is called by pptxConfigBuilder.ts and layoutHtml.tsx

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeContent } from '../src/utils/text.js';

describe('normalizeContent()', () => {
  test('string input returns single NormalizedRun', () => {
    const result = normalizeContent('hello');
    assert.deepStrictEqual(result, [{ text: 'hello' }]);
  });

  test('empty string returns single empty NormalizedRun', () => {
    const result = normalizeContent('');
    assert.deepStrictEqual(result, [{ text: '' }]);
  });

  test('TextRun array with string elements converts to NormalizedRuns', () => {
    const result = normalizeContent(['hello']);
    assert.deepStrictEqual(result, [{ text: 'hello' }]);
  });

  test('TextRun array with multiple string elements', () => {
    const result = normalizeContent(['hello', 'world']);
    assert.deepStrictEqual(result, [{ text: 'hello' }, { text: 'world' }]);
  });

  test('TextRun array with NormalizedRun objects passes through', () => {
    const result = normalizeContent([{ text: 'bold', bold: true }]);
    assert.deepStrictEqual(result, [{ text: 'bold', bold: true }]);
  });

  test('mixed array: strings and NormalizedRuns', () => {
    const result = normalizeContent([
      'plain',
      { text: 'bold', bold: true },
    ]);
    assert.deepStrictEqual(result, [
      { text: 'plain' },
      { text: 'bold', bold: true },
    ]);
  });

  test('mixed array with multiple formatting properties', () => {
    const result = normalizeContent([
      'normal',
      { text: 'styled', bold: true, italic: true, color: 'FF0000' },
      'more normal',
    ]);
    assert.deepStrictEqual(result, [
      { text: 'normal' },
      { text: 'styled', bold: true, italic: true, color: 'FF0000' },
      { text: 'more normal' },
    ]);
  });

  test('empty array returns empty array', () => {
    const result = normalizeContent([]);
    assert.deepStrictEqual(result, []);
  });

  test('TextRun with bullet property passes through', () => {
    const result = normalizeContent([{ text: 'item', bullet: true }]);
    assert.deepStrictEqual(result, [{ text: 'item', bullet: true }]);
  });

  test('TextRun with breakLine property passes through', () => {
    const result = normalizeContent([
      { text: 'line1', breakLine: true },
      { text: 'line2' },
    ]);
    assert.deepStrictEqual(result, [
      { text: 'line1', breakLine: true },
      { text: 'line2' },
    ]);
  });

  test('preserves all NormalizedRun properties', () => {
    const result = normalizeContent([
      {
        text: 'complex',
        bold: true,
        italic: true,
        underline: true,
        color: '0000FF',
        fontSize: 24,
        fontFace: 'Arial',
        bullet: true,
        breakLine: true,
      },
    ]);
    assert.deepStrictEqual(result, [
      {
        text: 'complex',
        bold: true,
        italic: true,
        underline: true,
        color: '0000FF',
        fontSize: 24,
        fontFace: 'Arial',
        bullet: true,
        breakLine: true,
      },
    ]);
  });
});
