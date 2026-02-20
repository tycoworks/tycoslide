// Token Resolution Tests
// Tests the token system: theme.components → variant overrides → required token validation

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { card } from '../src/dsl/card.js';
import { table } from '../src/dsl/table.js';
import { componentRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { BORDER_STYLE, TEXT_STYLE, GAP, HALIGN, VALIGN } from '../src/core/types.js';
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

    it('throws with "(none)" when no variants defined', async () => {
      const theme = mockTheme();
      const node = table([['a']], { variant: 'anything' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme }),
        /Available: \(none\)/
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
      // Remove titleStyle from card tokens
      delete (theme.components as any).card.titleStyle;
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
      // Remove multiple required tokens
      delete (theme.components as any).card.titleStyle;
      delete (theme.components as any).card.descriptionStyle;
      delete (theme.components as any).card.gap;
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
      // titleColor is optional — make sure it's NOT in the tokens
      delete (theme.components as any).card.titleColor;
      const node = card({ title: 'Test' });
      // Should not throw
      const expanded = await componentRegistry.expandTree(node, { theme });
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
    });
  });
});
