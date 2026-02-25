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
  it('returns normal font', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.NORMAL);
    assert.strictEqual(font.name, 'Test Normal');
    assert.strictEqual(font.path, '/fonts/test-normal.ttf');
  });

  it('returns bold font', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.BOLD);
    assert.strictEqual(font.name, 'Test Bold');
    assert.strictEqual(font.path, '/fonts/test-bold.ttf');
  });

  it('returns light font', () => {
    const font = getFontFromFamily(mockFontFamily, FONT_WEIGHT.LIGHT);
    assert.strictEqual(font.name, 'Test Light');
    assert.strictEqual(font.path, '/fonts/test-light.ttf');
  });

  it('throws for missing weight', () => {
    assert.throws(
      () => getFontFromFamily(mockFontFamilyNoBold, FONT_WEIGHT.BOLD),
      {
        name: 'Error',
        message: "Font weight 'bold' is not defined in this font family",
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
