// Token Resolution Tests
// Tests the 3-level token cascade: defaults → base overrides → variant overrides

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { card } from '../src/dsl/card.js';
import { table } from '../src/dsl/table.js';
import { componentRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { mockTheme } from './mocks.js';

describe('Token Resolution', () => {

  // ============================================
  // 1. DEFAULTS FROM THEME PRIMITIVES
  // ============================================

  describe('defaults from theme primitives', () => {
    it('card: uses theme.colors.secondary as default backgroundColor', async () => {
      const theme = mockTheme();
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.fill?.color, theme.colors.secondary);
        }
      }
    });

    it('card: uses theme.borders.radius as default cornerRadius', async () => {
      const theme = mockTheme({ borderRadius: 0.15 });
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.cornerRadius, theme.borders.radius);
        }
      }
    });

    it('card: uses theme.spacing.padding as default padding', async () => {
      const theme = mockTheme({ padding: 0.3 });
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.padding, theme.spacing.padding);
        }
      }
    });

    it('table: uses theme.colors.secondary as default borderColor', async () => {
      const theme = mockTheme();
      const node = table([['a', 'b']]);
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderColor, theme.colors.secondary);
      }
    });

    it('table: uses theme.borders.width as default borderWidth', async () => {
      const theme = mockTheme({ borderWidth: 2 });
      const node = table([['a', 'b']]);
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderWidth, theme.borders.width);
      }
    });
  });

  // ============================================
  // 2. BASE OVERRIDES FROM theme.components
  // ============================================

  describe('base overrides from theme.components', () => {
    it('card: applies backgroundColor and backgroundOpacity from theme.components.card', async () => {
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

    it('card: partial override — only backgroundColor overridden, padding still from defaults', async () => {
      const theme = mockTheme({ padding: 0.25, components: { card: { backgroundColor: 'FF1122' } } });
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.fill?.color, 'FF1122');
        }
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.padding, theme.spacing.padding);
        }
      }
    });

    it('table: applies borderColor and cellPadding from theme.components.table', async () => {
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

    it('table: partial override — only borderColor overridden, borderWidth still from defaults', async () => {
      const theme = mockTheme({ borderWidth: 1, components: { table: { borderColor: 'AABBCC' } } });
      const node = table([['a', 'b']]);
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderColor, 'AABBCC');
        assert.strictEqual(expanded.style.borderWidth, theme.borders.width);
      }
    });
  });

  // ============================================
  // 3. VARIANT RESOLUTION
  // ============================================

  describe('variant resolution', () => {
    it('(a) variant overrides base overrides — base borderColor + variant borderStyle', async () => {
      const theme = mockTheme({ components: { table: {
        borderColor: 'AABBCC',
        variants: {
          clean: { borderStyle: 'internal' },
        },
      }}});
      const node = table([['a']], { variant: 'clean' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderColor, 'AABBCC', 'base override should be preserved');
        assert.strictEqual(expanded.style.borderStyle, 'internal', 'variant override should apply');
      }
    });

    it('(b) variant overrides defaults when no base override', async () => {
      const theme = mockTheme({ components: { table: {
        variants: {
          minimal: { borderStyle: 'none' },
        },
      }}});
      const node = table([['a']], { variant: 'minimal' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderStyle, 'none', 'variant should override default');
        // Other tokens still from defaults
        assert.strictEqual(expanded.style.borderColor, theme.colors.secondary, 'other tokens still from defaults');
      }
    });

    it('(c) full cascade: defaults → base override → variant', async () => {
      const theme = mockTheme({ components: { table: {
        cellPadding: 0.2,
        variants: {
          grid: { borderStyle: 'internal', hAlign: 'center', vAlign: 'middle' },
        },
      }}});
      const node = table([['a']], { variant: 'grid' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.cellPadding, 0.2, 'base override should apply');
        assert.strictEqual(expanded.style.borderStyle, 'internal', 'variant override should apply');
        assert.strictEqual(expanded.style.hAlign, 'center', 'variant override should apply');
        assert.strictEqual(expanded.style.vAlign, 'middle', 'variant override should apply');
        assert.strictEqual(expanded.style.borderColor, theme.colors.secondary, 'defaults should fill remaining tokens');
      }
    });

    it('(d) no variant requested → variant not applied, default borderStyle used', async () => {
      const theme = mockTheme({ components: { table: {
        variants: { clean: { borderStyle: 'internal' } },
      }}});
      const node = table([['a']]);
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderStyle, 'full', 'default should apply when no variant requested');
      }
    });
  });

  // ============================================
  // 4. UNKNOWN VARIANT ERROR
  // ============================================

  describe('unknown variant error', () => {
    it('(a) throws with available variant names listed', async () => {
      const theme = mockTheme({ components: { table: {
        variants: {
          clean: { borderStyle: 'internal' },
          minimal: { borderStyle: 'none' },
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

    it('(b) throws with "(none)" when no variants defined', async () => {
      const theme = mockTheme({ components: { table: {} } });
      const node = table([['a']], { variant: 'anything' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme }),
        /Available: \(none\)/
      );
    });
  });

  // ============================================
  // 5. EMPTY COMPONENTS CONFIG
  // ============================================

  describe('empty components config', () => {
    it('components: {} → all defaults apply', async () => {
      const theme = mockTheme({ components: {} });
      const node = table([['a', 'b']]);
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.TABLE);
      if (expanded.type === NODE_TYPE.TABLE) {
        assert.ok(expanded.style);
        assert.strictEqual(expanded.style.borderStyle, 'full');
        assert.strictEqual(expanded.style.borderColor, theme.colors.secondary);
        assert.strictEqual(expanded.style.borderWidth, theme.borders.width);
        assert.strictEqual(expanded.style.cellPadding, theme.spacing.cellPadding);
      }
    });

    it('no components key at all → same result as empty components', async () => {
      const themeWithout = mockTheme();
      const themeWith = mockTheme({ components: {} });

      const node = table([['a', 'b']]);
      const expandedWithout = await componentRegistry.expandTree(node, { theme: themeWithout });
      const expandedWith = await componentRegistry.expandTree(node, { theme: themeWith });

      assert.strictEqual(expandedWithout.type, NODE_TYPE.TABLE);
      assert.strictEqual(expandedWith.type, NODE_TYPE.TABLE);

      if (expandedWithout.type === NODE_TYPE.TABLE && expandedWith.type === NODE_TYPE.TABLE) {
        assert.ok(expandedWithout.style);
        assert.ok(expandedWith.style);
        assert.strictEqual(expandedWithout.style.borderStyle, expandedWith.style.borderStyle);
        assert.strictEqual(expandedWithout.style.borderColor, expandedWith.style.borderColor);
        assert.strictEqual(expandedWithout.style.borderWidth, expandedWith.style.borderWidth);
        assert.strictEqual(expandedWithout.style.cellPadding, expandedWith.style.cellPadding);
      }
    });

    it('card with no components key → all card defaults apply', async () => {
      const theme = mockTheme();
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.fill?.color, theme.colors.secondary);
          assert.strictEqual(rect.fill?.opacity, theme.colors.subtleOpacity);
          assert.strictEqual(rect.cornerRadius, theme.borders.radius);
        }
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.padding, theme.spacing.padding);
        }
      }
    });
  });
});
