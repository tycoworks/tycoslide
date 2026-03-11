// Text Utilities Tests
// Tests for getFontFromFamily from src/utils/font.ts

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getFontFromFamily } from '../src/utils/font.js';
import { FONT_WEIGHT, type FontFamily } from '../src/core/model/types.js';

// ============================================
// TEST DATA
// ============================================

const mockFontFamily: FontFamily = {
  light: { name: 'Test Light', path: '/fonts/test-light.woff', weight: 300 },
  normal: { name: 'Test', path: '/fonts/test-normal.woff', weight: 400 },
  bold: { name: 'Test', path: '/fonts/test-bold.woff', weight: 700 },
};

const mockFontFamilyNoBold: FontFamily = {
  normal: { name: 'Test', path: '/fonts/test-normal.woff', weight: 400 },
};

// ============================================
// getFontFromFamily() TESTS
// ============================================

describe('getFontFromFamily', () => {
  it('returns normal font', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.NORMAL);
    assert.strictEqual(font.name, 'Test');
    assert.strictEqual(font.path, '/fonts/test-normal.woff');
  });

  it('returns bold font', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.BOLD);
    assert.strictEqual(font.name, 'Test');
    assert.strictEqual(font.path, '/fonts/test-bold.woff');
  });

  it('returns light font with its own PPTX typeface name', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.LIGHT);
    assert.strictEqual(font.name, 'Test Light');
    assert.strictEqual(font.path, '/fonts/test-light.woff');
  });

  it('throws for missing weight', () => {
    assert.throws(
      () => getFontFromFamily(mockFontFamilyNoBold, FONT_WEIGHT.BOLD),
      {
        name: 'Error',
        message: "Font weight 'bold' is not defined in font family 'Test'",
      }
    );
  });

  it('returns correct font properties (name, file)', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.NORMAL);
    assert.ok(font.name, 'Font should have a name');
    assert.ok(font.path, 'Font should have a path');
    assert.strictEqual(typeof font.name, 'string');
    assert.strictEqual(typeof font.path, 'string');
  });
});
