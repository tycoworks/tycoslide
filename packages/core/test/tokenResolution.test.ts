// Token Resolution Tests
// Tests the token system: theme.components → variant overrides → required token validation

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { card } from '../src/dsl/card.js';
import { quote } from '../src/dsl/quote.js';
import { table } from '../src/dsl/table.js';
import { prose, label } from '../src/dsl/text.js';
import { shape, line, slideNumber } from '../src/dsl/primitives.js';
import { componentRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { BORDER_STYLE, TEXT_STYLE, GAP, HALIGN, VALIGN, SHAPE, DASH_TYPE, Component } from '../src/core/types.js';
import { mockTheme } from './mocks.js';

describe('Token Resolution', () => {

  // ============================================
  // 1. TOKENS FROM THEME
  // ============================================

  describe('tokens from theme', () => {
    it('card: uses theme.components.card tokens', async () => {
      const theme = mockTheme();
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.fill?.color, '333333'); // from mock theme.components.card.backgroundColor
        }
      }
    });

    it('card: custom theme token values are used', async () => {
      const theme = mockTheme({ components: { card: { backgroundColor: 'AABBCC', backgroundOpacity: 50 } } });
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.fill?.color, 'AABBCC');
          assert.strictEqual(rect.fill?.opacity, 50);
        }
      }
    });

    it('card: padding comes from theme.components.card.padding', async () => {
      const theme = mockTheme({ components: { card: { padding: 0.5 } } });
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.padding, 0.5);
        }
      }
    });

    it('table: uses theme.components.table tokens', async () => {
      const theme = mockTheme();
      const node = table([['a', 'b']]);
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderColor, '333333');
        assert.strictEqual(expanded.style.borderWidth, theme.borders.width);
      }
    });

    it('table: custom theme tokens override mock defaults', async () => {
      const theme = mockTheme({ components: { table: { borderColor: 'AABBCC', cellPadding: 0.2 } } });
      const node = table([['a', 'b']]);
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderColor, 'AABBCC');
        assert.strictEqual(expanded.style.cellPadding, 0.2);
      }
    });
  });

  // ============================================
  // 2. VARIANT RESOLUTION
  // ============================================

  describe('variant resolution', () => {
    it('variant overrides base tokens', async () => {
      const theme = mockTheme({ components: { table: {
        borderColor: 'AABBCC',
        variants: {
          clean: { borderStyle: BORDER_STYLE.INTERNAL },
        },
      }}});
      const node = table([['a']], { variant: 'clean' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderColor, 'AABBCC', 'base token should be preserved');
        assert.strictEqual(expanded.style.borderStyle, BORDER_STYLE.INTERNAL, 'variant override should apply');
      }
    });

    it('full cascade: base tokens + variant overrides', async () => {
      const theme = mockTheme({ components: { table: {
        cellPadding: 0.2,
        variants: {
          grid: { borderStyle: BORDER_STYLE.INTERNAL, hAlign: HALIGN.CENTER, vAlign: VALIGN.MIDDLE },
        },
      }}});
      const node = table([['a']], { variant: 'grid' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.cellPadding, 0.2, 'base token should apply');
        assert.strictEqual(expanded.style.borderStyle, BORDER_STYLE.INTERNAL, 'variant override should apply');
        assert.strictEqual(expanded.style.hAlign, HALIGN.CENTER, 'variant override should apply');
      }
    });

    it('no variant requested → base tokens only', async () => {
      const theme = mockTheme({ components: { table: {
        variants: { clean: { borderStyle: BORDER_STYLE.INTERNAL } },
      }}});
      const node = table([['a']]);
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderStyle, BORDER_STYLE.FULL, 'base token should apply when no variant');
      }
    });
  });

  // ============================================
  // 3. UNKNOWN VARIANT ERROR
  // ============================================

  describe('unknown variant error', () => {
    it('throws with available variant names listed', async () => {
      const theme = mockTheme({ components: { table: {
        variants: {
          clean: { borderStyle: BORDER_STYLE.INTERNAL },
          minimal: { borderStyle: BORDER_STYLE.NONE },
        },
      }}});
      const node = table([['a']], { variant: 'nonexistent' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme }),
        (err: Error) => {
          assert.match(err.message, /Unknown variant 'nonexistent'/);
          assert.match(err.message, /clean/);
          assert.match(err.message, /minimal/);
          return true;
        }
      );
    });

    it('throws with available variants listed (default always present)', async () => {
      const theme = mockTheme();
      const node = table([['a']], { variant: 'anything' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme }),
        (err: Error) => {
          assert.match(err.message, /Unknown variant 'anything'/);
          assert.match(err.message, /default/);
          return true;
        }
      );
    });
  });

  // ============================================
  // 4. REQUIRED TOKEN VALIDATION (FAIL-FAST)
  // ============================================

  describe('required token validation', () => {
    it('throws when theme.components entry is missing entirely', async () => {
      // Create a theme with NO card tokens at all
      const theme = mockTheme();
      // Remove card from components
      delete (theme.components as any).card;
      const node = card({ title: 'Test' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme }),
        (err: Error) => {
          assert.match(err.message, /requires theme tokens/);
          assert.match(err.message, /theme\.components\.card/);
          return true;
        }
      );
    });

    it('throws when a required token is missing', async () => {
      const theme = mockTheme();
      // Remove titleStyle from card's default variant tokens
      delete (theme.components as any).card.variants.default.titleStyle;
      const node = card({ title: 'Test' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme }),
        (err: Error) => {
          assert.match(err.message, /missing required tokens/);
          assert.match(err.message, /titleStyle/);
          return true;
        }
      );
    });

    it('error message lists ALL missing tokens', async () => {
      const theme = mockTheme();
      // Remove multiple required tokens from card's default variant
      delete (theme.components as any).card.variants.default.titleStyle;
      delete (theme.components as any).card.variants.default.descriptionStyle;
      delete (theme.components as any).card.variants.default.gap;
      const node = card({ title: 'Test' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme }),
        (err: Error) => {
          assert.match(err.message, /titleStyle/);
          assert.match(err.message, /descriptionStyle/);
          assert.match(err.message, /gap/);
          return true;
        }
      );
    });

    it('succeeds when all required tokens are provided', async () => {
      const theme = mockTheme();
      const node = card({ title: 'Test' });
      // Should not throw — mockTheme provides all required tokens
      const expanded = await componentRegistry.expandTree(node, { theme });
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
    });

    it('optional tokens do not cause failure when missing', async () => {
      const theme = mockTheme();
      // titleColor is optional — make sure it's NOT in the variant tokens
      delete (theme.components as any).card.variants.default.titleColor;
      const node = card({ title: 'Test' });
      // Should not throw
      const expanded = await componentRegistry.expandTree(node, { theme });
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
    });
  });

  // ============================================
  // 5. TEXT VARIANT SELECTION
  // ============================================

  describe('text variant selection', () => {
    it('default variant: uses default text tokens', async () => {
      const theme = mockTheme();
      const node = prose('hello');
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
      assert.strictEqual(expanded.color, '000000'); // default text token
      assert.strictEqual(expanded.style, TEXT_STYLE.BODY);
    });

    it('non-default variant: uses variant text tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.Text]: {
            variants: {
              default: { color: '000000', bulletColor: '000000', style: TEXT_STYLE.BODY, lineHeightMultiplier: 1.0 },
              muted: { color: '999999', bulletColor: '999999', style: TEXT_STYLE.SMALL, lineHeightMultiplier: 1.2 },
            },
          },
        },
      });
      const node = prose('hello', { variant: 'muted' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.color, '999999');
      assert.strictEqual(expanded.style, TEXT_STYLE.SMALL);
    });

    it('props override variant tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.Text]: {
            variants: {
              default: { color: '000000', bulletColor: '000000', style: TEXT_STYLE.BODY, lineHeightMultiplier: 1.0 },
              muted: { color: '999999', bulletColor: '999999', style: TEXT_STYLE.SMALL, lineHeightMultiplier: 1.2 },
            },
          },
        },
      });
      // DSL caller passes explicit color — should win over muted variant's color
      const node = prose('hello', { variant: 'muted', color: 'FF0000' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.color, 'FF0000'); // props win
      assert.strictEqual(expanded.style, TEXT_STYLE.SMALL); // variant token (no prop override)
    });

    it('bulletColor from variant is applied to bullets', async () => {
      const theme = mockTheme({
        components: {
          [Component.Text]: {
            variants: {
              default: { color: '000000', bulletColor: '000000', style: TEXT_STYLE.BODY, lineHeightMultiplier: 1.0 },
              accent: { color: 'FF0000', bulletColor: 'FF0000', style: TEXT_STYLE.BODY, lineHeightMultiplier: 1.0 },
            },
          },
        },
      });
      const node = prose('- Item one', { variant: 'accent' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.color, 'FF0000');
      assert.deepStrictEqual(expanded.content[0].bullet, { color: 'FF0000' });
    });
  });

  // ============================================
  // 6. SHAPE VARIANT SELECTION
  // ============================================

  describe('shape variant selection', () => {
    it('default variant: uses default shape tokens', async () => {
      const theme = mockTheme();
      const node = shape({ shape: SHAPE.RECT });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.SHAPE);
      assert.strictEqual(expanded.fill.color, '333333'); // default shape token
    });

    it('non-default variant: uses variant shape tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.Shape]: {
            variants: {
              default: { fill: '333333', fillOpacity: 100, borderColor: 'FFFFFF', borderWidth: 0, cornerRadius: 0 },
              primary: { fill: 'FF0000', fillOpacity: 100, borderColor: 'FFFFFF', borderWidth: 0, cornerRadius: 0.1 },
            },
          },
        },
      });
      const node = shape({ shape: SHAPE.RECT, variant: 'primary' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.fill.color, 'FF0000');
      assert.strictEqual(expanded.cornerRadius, 0.1);
    });

    it('DSL props override variant tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.Shape]: {
            variants: {
              default: { fill: '333333', fillOpacity: 100, borderColor: 'FFFFFF', borderWidth: 0, cornerRadius: 0 },
              primary: { fill: 'FF0000', fillOpacity: 80, borderColor: 'FFFFFF', borderWidth: 0, cornerRadius: 0.1 },
            },
          },
        },
      });
      // DSL caller passes explicit fill — should win over primary variant's tokens
      const node = shape({ shape: SHAPE.RECT, variant: 'primary', fill: '00FF00', fillOpacity: 50 });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.deepStrictEqual(expanded.fill, { color: '00FF00', opacity: 50 }); // props win
      assert.strictEqual(expanded.cornerRadius, 0.1); // variant token (no prop override)
    });
  });

  // ============================================
  // 7. LINE VARIANT SELECTION
  // ============================================

  describe('line variant selection', () => {
    it('default variant: uses default line tokens', async () => {
      const theme = mockTheme();
      const node = line();
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.LINE);
      assert.strictEqual(expanded.color, '333333'); // default line token
      assert.strictEqual(expanded.dashType, DASH_TYPE.SOLID);
    });

    it('non-default variant: uses variant line tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.Line]: {
            variants: {
              default: { color: '333333', width: 1, dashType: DASH_TYPE.SOLID },
              dashed: { color: '999999', width: 2, dashType: DASH_TYPE.DASH },
            },
          },
        },
      });
      const node = line({ variant: 'dashed' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.color, '999999');
      assert.strictEqual(expanded.width, 2);
      assert.strictEqual(expanded.dashType, DASH_TYPE.DASH);
    });

    it('DSL props override variant tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.Line]: {
            variants: {
              default: { color: '333333', width: 1, dashType: DASH_TYPE.SOLID },
              dashed: { color: '999999', width: 2, dashType: DASH_TYPE.DASH },
            },
          },
        },
      });
      const node = line({ variant: 'dashed', color: 'FF0000', width: 3 });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.color, 'FF0000'); // props win
      assert.strictEqual(expanded.width, 3); // props win
      assert.strictEqual(expanded.dashType, DASH_TYPE.DASH); // variant token (no prop override)
    });
  });

  // ============================================
  // 8. SLIDE NUMBER VARIANT SELECTION
  // ============================================

  describe('slideNumber variant selection', () => {
    it('default variant: uses default slideNumber tokens', async () => {
      const theme = mockTheme();
      const node = slideNumber();
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.SLIDE_NUMBER);
      assert.strictEqual(expanded.style, TEXT_STYLE.FOOTER);
      assert.strictEqual(expanded.color, '666666');
      assert.strictEqual(expanded.hAlign, HALIGN.RIGHT);
    });

    it('non-default variant: uses variant slideNumber tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.SlideNumber]: {
            variants: {
              default: { style: TEXT_STYLE.FOOTER, color: '666666', hAlign: HALIGN.RIGHT },
              minimal: { style: TEXT_STYLE.SMALL, color: '999999', hAlign: HALIGN.LEFT },
            },
          },
        },
      });
      const node = slideNumber({ variant: 'minimal' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.style, TEXT_STYLE.SMALL);
      assert.strictEqual(expanded.color, '999999');
      assert.strictEqual(expanded.hAlign, HALIGN.LEFT);
    });

    it('DSL props override variant tokens', async () => {
      const theme = mockTheme();
      const node = slideNumber({ color: 'FF0000', hAlign: HALIGN.LEFT });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.color, 'FF0000'); // props win
      assert.strictEqual(expanded.hAlign, HALIGN.LEFT); // props win
      assert.strictEqual(expanded.style, TEXT_STYLE.FOOTER); // token (no prop override)
    });
  });

  // ============================================
  // 9. CARD VARIANT SELECTION
  // ============================================

  describe('card variant selection', () => {
    it('non-default variant: uses variant card tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.Card]: {
            variants: {
              default: {
                padding: 0.25, cornerRadius: 0.1, backgroundColor: '333333', backgroundOpacity: 20,
                borderColor: '333333', borderWidth: 1, titleStyle: TEXT_STYLE.H4,
                descriptionStyle: TEXT_STYLE.SMALL, gap: GAP.TIGHT,
              },
              outlined: {
                padding: 0.5, cornerRadius: 0.2, backgroundColor: 'none', backgroundOpacity: 0,
                borderColor: 'FF0000', borderWidth: 2, titleStyle: TEXT_STYLE.H3,
                descriptionStyle: TEXT_STYLE.BODY, gap: GAP.NORMAL,
              },
            },
          },
        },
      });
      const node = card({ title: 'Test', variant: 'outlined' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      // outlined variant has backgroundColor: 'none', so no background shape — just a column
      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    });

    it('base card variant applies default tokens', async () => {
      const theme = mockTheme();
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      // Background shape uses default tokens
      const rect = expanded.children[0];
      assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
      assert.strictEqual(rect.fill.color, '333333');
    });
  });

  // ============================================
  // 10. QUOTE VARIANT SELECTION
  // ============================================

  describe('quote variant selection', () => {
    it('default variant: uses default quote tokens', async () => {
      const theme = mockTheme();
      const node = quote({ quote: '"Test quote"' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      // Background shape uses default tokens
      const rect = expanded.children[0];
      assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
      assert.strictEqual(rect.fill.color, '333333');
    });

    it('non-default variant: uses variant quote tokens', async () => {
      const theme = mockTheme({
        components: {
          [Component.Quote]: {
            variants: {
              default: {
                padding: 0.5, cornerRadius: 0.1, backgroundColor: '333333', backgroundOpacity: 20,
                borderColor: '333333', borderWidth: 1, attributionStyle: TEXT_STYLE.SMALL, gap: GAP.NORMAL,
              },
              accent: {
                padding: 0.75, cornerRadius: 0.2, backgroundColor: 'FF0000', backgroundOpacity: 50,
                borderColor: 'FF0000', borderWidth: 2, attributionStyle: TEXT_STYLE.EYEBROW, gap: GAP.LOOSE,
              },
            },
          },
        },
      });
      const node = quote({ quote: '"Test quote"', variant: 'accent' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      const rect = expanded.children[0];
      assert.strictEqual(rect.fill.color, 'FF0000');
      assert.strictEqual(rect.fill.opacity, 50);
    });

    it('no background variant returns column directly', async () => {
      const theme = mockTheme({
        components: {
          [Component.Quote]: {
            backgroundColor: 'none',
          },
        },
      });
      const node = quote({ quote: '"Test quote"' });
      const expanded = await componentRegistry.expandTree(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    });
  });
});
