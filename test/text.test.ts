// Text Utilities Tests
// Tests for text.ts utility functions

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { getFontFromFamily, normalizeContent } from '../src/utils/text.js';
import { FONT_WEIGHT, type FontFamily, type NormalizedRun } from '../src/core/types.js';

// ============================================
// TEST DATA
// ============================================

const mockFontFamily: FontFamily = {
  light: { name: 'Test Light', path: '/fonts/test-light.ttf' },
  normal: { name: 'Test Normal', path: '/fonts/test-normal.ttf' },
  bold: { name: 'Test Bold', path: '/fonts/test-bold.ttf' },
};

const mockFontFamilyNoBold: FontFamily = {
  normal: { name: 'Test Normal', path: '/fonts/test-normal.ttf' },
};

// ============================================
// getFontFromFamily() TESTS
// ============================================

describe('getFontFromFamily', () => {
  it('returns normal font for FONT_WEIGHT.NORMAL', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.NORMAL);
    assert.strictEqual(font.name, 'Test Normal');
    assert.strictEqual(font.path, '/fonts/test-normal.ttf');
  });

  it('returns bold font for FONT_WEIGHT.BOLD', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.BOLD);
    assert.strictEqual(font.name, 'Test Bold');
    assert.strictEqual(font.path, '/fonts/test-bold.ttf');
  });

  it('returns light font for FONT_WEIGHT.LIGHT', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.LIGHT);
    assert.strictEqual(font.name, 'Test Light');
    assert.strictEqual(font.path, '/fonts/test-light.ttf');
  });

  it('throws error when bold font is missing', () => {
    assert.throws(
      () => getFontFromFamily(mockFontFamilyNoBold, FONT_WEIGHT.BOLD),
      {
        name: 'Error',
        message: "Font weight 'bold' is not defined in this font family",
      }
    );
  });

  it('throws error when light font is missing', () => {
    assert.throws(
      () => getFontFromFamily(mockFontFamilyNoBold, FONT_WEIGHT.LIGHT),
      {
        name: 'Error',
        message: "Font weight 'light' is not defined in this font family",
      }
    );
  });
});

// ============================================
// normalizeContent() TESTS
// ============================================

describe('normalizeContent', () => {
  it('converts string to array with single NormalizedRun', () => {
    const result = normalizeContent('Hello world');
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], { text: 'Hello world' });
  });

  it('converts empty string to array with single empty NormalizedRun', () => {
    const result = normalizeContent('');
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], { text: '' });
  });

  it('converts TextRun object to array preserving properties', () => {
    const run = { text: 'Bold text', weight: FONT_WEIGHT.BOLD };
    const result = normalizeContent([run]);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], { text: 'Bold text', weight: FONT_WEIGHT.BOLD });
  });

  it('converts TextRun with color to array preserving color', () => {
    const run = { text: 'Red text', color: 'FF0000' };
    const result = normalizeContent([run]);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], { text: 'Red text', color: 'FF0000' });
  });

  it('converts TextRun with highlight to array preserving highlight', () => {
    const highlight = { bg: 'FFFF00', text: '000000' };
    const run = { text: 'Highlighted', highlight };
    const result = normalizeContent([run]);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], { text: 'Highlighted', highlight });
  });

  it('converts array of strings to multiple NormalizedRuns', () => {
    const result = normalizeContent(['First', 'Second', 'Third']);
    assert.strictEqual(result.length, 3);
    assert.deepStrictEqual(result[0], { text: 'First' });
    assert.deepStrictEqual(result[1], { text: 'Second' });
    assert.deepStrictEqual(result[2], { text: 'Third' });
  });

  it('converts array of TextRuns preserving each run\'s properties', () => {
    const runs = [
      { text: 'Normal' },
      { text: 'Bold', weight: FONT_WEIGHT.BOLD },
      { text: 'Light', weight: FONT_WEIGHT.LIGHT },
    ];
    const result = normalizeContent(runs);
    assert.strictEqual(result.length, 3);
    assert.deepStrictEqual(result[0], { text: 'Normal' });
    assert.deepStrictEqual(result[1], { text: 'Bold', weight: FONT_WEIGHT.BOLD });
    assert.deepStrictEqual(result[2], { text: 'Light', weight: FONT_WEIGHT.LIGHT });
  });

  it('converts mixed array of strings and TextRuns', () => {
    const content = [
      'Plain text',
      { text: 'Bold text', weight: FONT_WEIGHT.BOLD },
      'More plain',
      { text: 'Colored', color: '0000FF' },
    ];
    const result = normalizeContent(content);
    assert.strictEqual(result.length, 4);
    assert.deepStrictEqual(result[0], { text: 'Plain text' });
    assert.deepStrictEqual(result[1], { text: 'Bold text', weight: FONT_WEIGHT.BOLD });
    assert.deepStrictEqual(result[2], { text: 'More plain' });
    assert.deepStrictEqual(result[3], { text: 'Colored', color: '0000FF' });
  });

  it('handles empty array', () => {
    const result = normalizeContent([]);
    assert.strictEqual(result.length, 0);
  });

  it('handles array with single empty string', () => {
    const result = normalizeContent(['']);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], { text: '' });
  });

  it('preserves all properties in complex TextRun', () => {
    const highlight = { bg: 'FFFF00', text: '000000' };
    const run = {
      text: 'Complex run',
      weight: FONT_WEIGHT.BOLD,
      color: 'FF0000',
      highlight,
    };
    const result = normalizeContent([run]);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], {
      text: 'Complex run',
      weight: FONT_WEIGHT.BOLD,
      color: 'FF0000',
      highlight,
    });
  });
});
