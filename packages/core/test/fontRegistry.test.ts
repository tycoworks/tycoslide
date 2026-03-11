// Font Registry Tests
// Tests for validateThemeFonts (structural validation) and generateFontFaceCSS (CSS generation)

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateThemeFonts } from '../src/core/rendering/themeValidator.js';
import { generateFontFaceCSS } from '../src/core/layout/layoutHtml.js';
import { mockTheme } from './mocks.js';

describe('validateThemeFonts', () => {
  describe('.woff format requirement', () => {
    it('throws when regular slot is not .woff', () => {
      const theme = mockTheme();
      theme.fonts = [
        { name: 'Bad Font', regular: { path: '/fake/bad-font.woff2', weight: 400 } },
      ];
      assert.throws(
        () => validateThemeFonts(theme),
        /not \.woff format.*Only \.woff is supported/,
      );
    });

    it('throws when italic slot is not .woff', () => {
      const theme = mockTheme();
      theme.fonts = [
        {
          name: 'Bad Italic',
          regular: { path: '/fake/regular.woff', weight: 400 },
          italic: { path: '/fake/italic.woff2', weight: 400 },
        },
      ];
      assert.throws(
        () => validateThemeFonts(theme),
        /not \.woff format.*Only \.woff is supported/,
      );
    });

    it('throws when boldItalic slot is not .woff', () => {
      const theme = mockTheme();
      theme.fonts = [
        {
          name: 'Bad BoldItalic',
          regular: { path: '/fake/regular.woff', weight: 400 },
          bold: { path: '/fake/bold.woff', weight: 700 },
          boldItalic: { path: '/fake/bold-italic.woff2', weight: 700 },
        },
      ];
      assert.throws(
        () => validateThemeFonts(theme),
        /not \.woff format.*Only \.woff is supported/,
      );
    });

    it('throws for .ttf paths', () => {
      const theme = mockTheme();
      theme.fonts = [
        { name: 'Raw TTF', regular: { path: '/fake/font.ttf', weight: 400 } },
      ];
      assert.throws(
        () => validateThemeFonts(theme),
        /not \.woff format.*Only \.woff is supported/,
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
        name: 'Unregistered Font',
        regular: { path: '/fake/unregistered.woff', weight: 400 },
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

    it('accepts FontFamily with italic and boldItalic slots', () => {
      const theme = mockTheme();
      const fullFamily = {
        name: 'Full',
        regular: { path: '/fake/full-400.woff', weight: 400 },
        italic: { path: '/fake/full-400-italic.woff', weight: 400 },
        bold: { path: '/fake/full-700.woff', weight: 700 },
        boldItalic: { path: '/fake/full-700-italic.woff', weight: 700 },
      };
      theme.fonts = [fullFamily];
      for (const styleName of Object.keys(theme.textStyles)) {
        theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: fullFamily };
      }
      assert.doesNotThrow(() => validateThemeFonts(theme));
    });
  });

  describe('layout and master token validation', () => {
    it('throws when layout FontFamily token is not in theme.fonts', () => {
      const unregisteredFamily = {
        name: 'Unknown Mono',
        regular: { path: '/fake/unknown-mono.woff', weight: 400 },
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
    // mockTheme has regular (weight: 400) and bold (weight: 700)
    assert.ok(result.css.includes('font-weight: 400'), 'should emit font-weight: 400 for regular');
    assert.ok(result.css.includes('font-weight: 700'), 'should emit font-weight: 700 for bold');
  });

  it('emits font-style: italic for italic slots', () => {
    const theme = mockTheme();
    theme.fonts = [
      {
        name: 'Inter',
        regular: { path: '/fake/inter-400.woff', weight: 400 },
        italic: { path: '/fake/inter-400-italic.woff', weight: 400 },
        bold: { path: '/fake/inter-700.woff', weight: 700 },
        boldItalic: { path: '/fake/inter-700-italic.woff', weight: 700 },
      },
    ];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = {
        ...theme.textStyles[styleName],
        fontFamily: theme.fonts[0],
      };
    }
    const result = generateFontFaceCSS(theme);
    assert.ok(result.css.includes('font-style: italic'), 'should emit font-style: italic for italic slots');
    assert.ok(result.css.includes('font-style: normal'), 'should emit font-style: normal for regular slots');
    // boldItalic block should have both font-weight: 700 AND font-style: italic
    const blocks = result.css.split('@font-face');
    const boldItalicBlock = blocks.find(b =>
      b.includes('inter-700-italic.woff'),
    );
    assert.ok(boldItalicBlock, 'should have a boldItalic @font-face block');
    assert.ok(boldItalicBlock!.includes('font-weight: 700'), 'boldItalic block should have font-weight: 700');
    assert.ok(boldItalicBlock!.includes('font-style: italic'), 'boldItalic block should have font-style: italic');
  });

  it('emits font-weight from Font.weight for light FontFamily', () => {
    const theme = mockTheme();
    const interLight = {
      name: 'Inter Light',
      regular: { path: '/fake/inter-300.woff', weight: 300 },
      bold: { path: '/fake/inter-700.woff', weight: 700 },
    };
    theme.fonts = [interLight];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = {
        ...theme.textStyles[styleName],
        fontFamily: interLight,
      };
    }
    const result = generateFontFaceCSS(theme);
    assert.ok(result.css.includes('font-weight: 300'), 'should emit font-weight: 300 for light regular');
    assert.ok(result.css.includes('font-weight: 700'), 'should emit font-weight: 700 for bold');
  });

  it('deduplicates fonts with same path within a family', () => {
    const theme = mockTheme();
    const result = generateFontFaceCSS(theme);
    // mockTheme uses the same mockFontFamily (regular + bold) for all textStyles,
    // so there should be exactly 2 @font-face rules (one per unique weight path),
    // both sharing font-family: 'Inter' with different font-weight values
    const interCount = (result.css.match(/font-family: 'Inter'/g) || []).length;
    assert.strictEqual(interCount, 2, 'Inter should have 2 @font-face rules (regular + bold)');
  });

  it('emits separate @font-face rules when families share a font file', () => {
    const theme = mockTheme();
    const sharedBoldPath = '/fake/shared-700.woff';
    const inter = {
      name: 'Inter',
      regular: { path: '/fake/inter-400.woff', weight: 400 },
      bold: { path: sharedBoldPath, weight: 700 },
    };
    const interLight = {
      name: 'Inter Light',
      regular: { path: '/fake/inter-300.woff', weight: 300 },
      bold: { path: sharedBoldPath, weight: 700 },
    };
    theme.fonts = [inter, interLight];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: inter };
    }
    const result = generateFontFaceCSS(theme);
    const interCount = (result.css.match(/font-family: 'Inter'/g) || []).length;
    const lightCount = (result.css.match(/font-family: 'Inter Light'/g) || []).length;
    assert.strictEqual(interCount, 2, 'Inter should have 2 rules (regular + bold)');
    assert.strictEqual(lightCount, 2, 'Inter Light should have 2 rules (regular + bold) despite shared bold file');
  });

  it('skips fonts with empty path', () => {
    const theme = mockTheme();
    theme.fonts = [
      ...theme.fonts,
      { name: 'System Mono', regular: { path: '', weight: 400 } },
    ];
    const result = generateFontFaceCSS(theme);
    assert.ok(!result.css.includes('System Mono'), 'should skip system fonts with empty path');
  });

  it('generates exactly one @font-face rule for regular-only FontFamily', () => {
    const theme = mockTheme();
    // Replace fonts with a single regular-only family
    const mono = { name: 'Mono', regular: { path: '/fake/mono-400.woff', weight: 400 } };
    theme.fonts = [mono];
    // Update textStyles to use this family
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = {
        ...theme.textStyles[styleName],
        fontFamily: mono,
      };
    }
    const result = generateFontFaceCSS(theme);
    const monoCount = (result.css.match(/font-family: 'Mono'/g) || []).length;
    assert.strictEqual(monoCount, 1, 'regular-only family should have exactly 1 @font-face rule');
  });

  it('uses family.name for CSS font-family even when font.name is set', () => {
    const theme = mockTheme();
    const interLight = {
      name: 'Inter Light',
      regular: { path: '/fake/inter-300.woff', weight: 300 },
      bold: { path: '/fake/inter-700.woff', weight: 700, name: 'Inter' },
    };
    theme.fonts = [interLight];
    for (const styleName of Object.keys(theme.textStyles)) {
      theme.textStyles[styleName] = { ...theme.textStyles[styleName], fontFamily: interLight };
    }
    const result = generateFontFaceCSS(theme);
    // CSS @font-face should use family.name ('Inter Light'), not font.name ('Inter')
    assert.ok(!result.css.includes("font-family: 'Inter';"), 'should not emit font.name as CSS font-family');
    const lightCount = (result.css.match(/font-family: 'Inter Light'/g) || []).length;
    assert.strictEqual(lightCount, 2, 'both rules should use family.name Inter Light');
  });
});
