// Font Registry Tests
// Tests for validateThemeFonts (structural validation) and generateFontFaceCSS (CSS generation)

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateThemeFonts } from '../src/core/rendering/themeValidator.js';
import { generateFontFaceCSS } from '../src/core/layout/layoutHtml.js';
import { mockTheme } from './mocks.js';

describe('validateThemeFonts', () => {
  describe('WOFF2 rejection', () => {
    it('throws when theme.fonts contains a .woff2 path', () => {
      const theme = mockTheme();
      theme.fonts = [
        { normal: { name: 'Bad Font', path: '/fake/bad-font.woff2', weight: 400 } },
      ];
      assert.throws(
        () => validateThemeFonts(theme),
        /WOFF2 format.*Only .woff is supported/,
      );
    });

    it('does not throw for .woff paths', () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });
  });

  describe('textStyle validation', () => {
    it('throws when textStyle font is not in theme.fonts', () => {
      const theme = mockTheme();
      const unregisteredFamily = {
        normal: { name: 'Unregistered Font', path: '/fake/unregistered.woff', weight: 400 },
      };
      theme.textStyles.h1 = { ...theme.textStyles.h1, fontFamily: unregisteredFamily };

      assert.throws(
        () => validateThemeFonts(theme),
        /Unregistered Font.*textStyle "h1".*not listed in theme\.fonts/,
      );
    });

    it('does not throw when all textStyle fonts are in theme.fonts', () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });
  });

  describe('layout and master token validation', () => {
    it('throws when layout FontFamily token is not in theme.fonts', () => {
      const unregisteredFamily = {
        normal: { name: 'Unknown Mono', path: '/fake/unknown-mono.woff', weight: 400 },
      };
      const theme = mockTheme({
        layouts: {
          body: {
            variants: {
              default: {
                heading: { fontFamily: unregisteredFamily },
              },
            },
          },
        },
      });

      assert.throws(
        () => validateThemeFonts(theme),
        /Unknown Mono.*layout "body".*not listed in theme\.fonts/,
      );
    });

    it('does not throw when layout tokens have no FontFamily values', () => {
      const theme = mockTheme({
        layouts: {
          body: {
            variants: {
              default: {
                color: '#FF0000',
                style: 'body',
              },
            },
          },
        },
      });
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });

    it('does not throw when theme has no layouts', () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });
  });

  describe('bold.name validation', () => {
    it('throws when bold.name does not match normal.name', () => {
      const theme = mockTheme();
      theme.fonts = [
        {
          normal: { name: 'Inter', path: '/fake/inter-400.woff', weight: 400 },
          bold: { name: 'Inter Bold', path: '/fake/inter-700.woff', weight: 700 },
        },
      ];
      assert.throws(
        () => validateThemeFonts(theme),
        /bold\.name "Inter Bold" does not match normal\.name "Inter"/,
      );
    });

    it('does not throw when bold.name matches normal.name', () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });
  });

  describe('light.name validation', () => {
    it('accepts light.name that differs from normal.name (PPTX needs distinct typeface)', () => {
      const theme = mockTheme();
      theme.fonts = [
        {
          light: { name: 'Inter Light', path: '/fake/inter-300.woff', weight: 300 },
          normal: { name: 'Inter', path: '/fake/inter-400.woff', weight: 400 },
          bold: { name: 'Inter', path: '/fake/inter-700.woff', weight: 700 },
        },
      ];
      // Update textStyles to reference these fonts
      for (const styleName of Object.keys(theme.textStyles)) {
        theme.textStyles[styleName] = {
          ...theme.textStyles[styleName],
          fontFamily: theme.fonts[0],
        };
      }
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });
  });
});

describe('generateFontFaceCSS', () => {
  it('produces @font-face rules from theme.fonts', () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    assert.ok(result.css.includes('@font-face'), 'should produce @font-face rules');
    assert.ok(result.css.includes('Inter'), 'should include Inter font');
  });

  it('returns FontDescriptor array matching theme.fonts', () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    assert.ok(result.fonts.length > 0, 'should have font descriptors');
    const names = result.fonts.map(f => f.name);
    assert.ok(names.includes('Inter'), 'should include Inter');
  });

  it('emits correct font-weight values from Font.weight', () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    // mockTheme has normal (weight: 400) and bold (weight: 700)
    assert.ok(result.css.includes('font-weight: 400'), 'should emit font-weight: 400 for normal');
    assert.ok(result.css.includes('font-weight: 700'), 'should emit font-weight: 700 for bold');
  });

  it('emits font-weight from Font.weight for light fonts', () => {
    const theme = mockTheme();
    theme.fonts = [
      {
        light: { name: 'Inter Light', path: '/fake/inter-300.woff', weight: 300 },
        normal: { name: 'Inter', path: '/fake/inter-400.woff', weight: 400 },
        bold: { name: 'Inter', path: '/fake/inter-700.woff', weight: 700 },
      },
    ];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = {
        ...theme.textStyles[styleName],
        fontFamily: theme.fonts[0],
      };
    }
    const result = generateFontFaceCSS(theme);
    assert.ok(result.css.includes('font-weight: 300'), 'should emit font-weight: 300 for light');
    assert.ok(result.css.includes('font-weight: 400'), 'should emit font-weight: 400 for normal');
    assert.ok(result.css.includes('font-weight: 700'), 'should emit font-weight: 700 for bold');
  });

  it('deduplicates fonts with same path', () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    // mockTheme uses the same mockFontFamily (normal + bold) for all textStyles,
    // so there should be exactly 2 @font-face rules (one per unique weight path),
    // both sharing font-family: 'Inter' with different font-weight values
    const interCount = (result.css.match(/font-family: 'Inter'/g) || []).length;
    assert.strictEqual(interCount, 2, 'Inter should have 2 @font-face rules (normal + bold)');
  });

  it('skips fonts with empty path', () => {
    const theme = mockTheme();
    theme.fonts = [
      ...theme.fonts,
      { normal: { name: 'System Mono', path: '', weight: 400 } },
    ];
    const result = generateFontFaceCSS(theme);
    assert.ok(!result.css.includes('System Mono'), 'should skip system fonts with empty path');
  });

  it('generates exactly one @font-face rule for normal-only FontFamily', () => {
    const theme = mockTheme();
    // Replace fonts with a single normal-only family
    theme.fonts = [
      { normal: { name: 'Mono', path: '/fake/mono-400.woff', weight: 400 } },
    ];
    // Update textStyles to use this family
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = {
        ...theme.textStyles[styleName],
        fontFamily: { normal: { name: 'Mono', path: '/fake/mono-400.woff', weight: 400 } },
      };
    }
    const result = generateFontFaceCSS(theme);
    const monoCount = (result.css.match(/font-family: 'Mono'/g) || []).length;
    assert.strictEqual(monoCount, 1, 'normal-only family should have exactly 1 @font-face rule');
  });
});
