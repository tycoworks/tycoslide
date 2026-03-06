// Font Registry Tests
// Tests for theme.fonts validation in generateFontFaceCSS

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { generateFontFaceCSS } from '../src/core/layout/layoutHtml.js';
import { mockTheme } from './mocks.js';

// Clear the internal cache between tests by generating unique font scenarios
// (the cache is keyed on sorted font paths, so different themes get different entries)

describe('generateFontFaceCSS — font registry', () => {
  describe('happy path', () => {
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

    it('deduplicates fonts with same path', () => {
      const theme = mockTheme();
      const result = generateFontFaceCSS(theme);
      // mockTheme uses the same mockFontFamily for all textStyles,
      // so each unique font path should appear exactly once
      const interCount = (result.css.match(/font-family: 'Inter'/g) || []).length;
      assert.strictEqual(interCount, 1, 'Inter normal should appear exactly once');
    });

    it('skips fonts with empty path', () => {
      const theme = mockTheme();
      // Add a system font (empty path) to theme.fonts
      theme.fonts = [
        ...theme.fonts,
        { normal: { name: 'System Mono', path: '' } },
      ];
      const result = generateFontFaceCSS(theme);
      assert.ok(!result.css.includes('System Mono'), 'should skip system fonts with empty path');
    });
  });

  describe('textStyle validation', () => {
    it('throws when textStyle font is not in theme.fonts', () => {
      const theme = mockTheme();
      // Replace textStyle fontFamily with one NOT in theme.fonts
      const unregisteredFamily = {
        normal: { name: 'Unregistered Font', path: '/fake/unregistered.woff2' },
      };
      theme.textStyles.h1 = { ...theme.textStyles.h1, fontFamily: unregisteredFamily };

      assert.throws(
        () => generateFontFaceCSS(theme),
        /Unregistered Font.*textStyle "h1".*not listed in theme\.fonts/,
      );
    });

    it('does not throw when all textStyle fonts are in theme.fonts', () => {
      const theme = mockTheme();
      // Default mockTheme has matching fonts — should not throw
      assert.doesNotThrow(() => generateFontFaceCSS(theme));
    });
  });

  describe('layout and master token validation', () => {
    it('throws when layout FontFamily token is not in theme.fonts', () => {
      const unregisteredFamily = {
        normal: { name: 'Unknown Mono', path: '/fake/unknown-mono.woff2' },
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
        () => generateFontFaceCSS(theme),
        /Unknown Mono.*layout "body".*not listed in theme\.fonts/,
      );
    });

    it('does not throw when layout tokens have no FontFamily values', () => {
      const theme = mockTheme({
        layouts: {
          body: {
            variants: {
              default: {
                color: 'FF0000',
                style: 'body',
              },
            },
          },
        },
      });
      assert.doesNotThrow(() => generateFontFaceCSS(theme));
    });

    it('does not throw when theme has no layouts', () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => generateFontFaceCSS(theme));
    });
  });

  describe('caching', () => {
    it('returns same object for same font set', () => {
      const theme = mockTheme();
      const result1 = generateFontFaceCSS(theme);
      const result2 = generateFontFaceCSS(theme);
      assert.strictEqual(result1, result2, 'should return cached result');
    });
  });
});
