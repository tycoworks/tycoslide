// Text Utilities Tests
// Tests for getFontFromFamily and resolveLineHeight from src/utils/text.ts

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getFontFromFamily, resolveLineHeight } from '../src/utils/font.js';
import { FONT_WEIGHT, type FontFamily, type TextStyle } from '../src/core/model/types.js';
import { mockTheme } from './mocks.js';

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

// ============================================
// resolveLineHeight() TESTS
// ============================================

describe('resolveLineHeight', () => {
  const theme = mockTheme({ lineSpacing: 1.0, bulletSpacing: 1.5 });
  const baseStyle: TextStyle = { fontSize: 12, fontFamily: mockFontFamily };
  const styleWithMultiplier: TextStyle = { fontSize: 12, fontFamily: mockFontFamily, lineHeightMultiplier: 1.3 };

  it('returns theme line spacing as default', () => {
    assert.strictEqual(resolveLineHeight(undefined, baseStyle, theme), 1.0);
  });

  it('returns theme bullet spacing when hasBullets=true', () => {
    assert.strictEqual(resolveLineHeight(undefined, baseStyle, theme, true), 1.5);
  });

  it('style multiplier overrides theme default', () => {
    assert.strictEqual(resolveLineHeight(undefined, styleWithMultiplier, theme), 1.3);
  });

  it('node multiplier overrides both style and theme', () => {
    assert.strictEqual(resolveLineHeight(2.0, styleWithMultiplier, theme), 2.0);
  });

  it('node multiplier overrides style multiplier', () => {
    assert.strictEqual(resolveLineHeight(2.0, styleWithMultiplier, theme, true), 2.0);
  });

  it('uses theme default when no overrides', () => {
    assert.strictEqual(resolveLineHeight(undefined, baseStyle, theme, false), 1.0);
  });
});
