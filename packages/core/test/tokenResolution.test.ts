// Token Resolution Engine Tests
// Tests the core token resolution mechanism: theme lookup, variant resolution, validation.
// Uses a simple inline test component — does NOT test specific component implementations.

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { componentRegistry, component } from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import { HALIGN, VALIGN } from '../src/core/model/types.js';
import { schema } from '../src/core/model/schema.js';
import { mockTheme, noopRender } from './mocks.js';

// ============================================
// TEST COMPONENT WITH DECLARED TOKENS
// ============================================

const TOKEN_COMP = 'test-token-engine';

componentRegistry.define({
  name: TOKEN_COMP as any,
  params: {
    label: schema.string().optional(),
    variant: schema.string().optional(),
  },
  tokens: ['alpha', 'beta', 'gamma'],
  expand: (props: any, _ctx: any, tokens: any): any => ({
    type: NODE_TYPE.TEXT,
    content: [{ text: props.label ?? '' }],
    hAlign: HALIGN.LEFT as any,
    vAlign: VALIGN.TOP as any,
    // Stash resolved tokens for assertion
    _tokens: { ...tokens },
  }),
});

/** Create a theme with tokens for the test component. */
function tokenTheme(config: Record<string, unknown>) {
  return mockTheme({ components: { [TOKEN_COMP]: config } });
}

describe('Token Resolution Engine', () => {

  // ============================================
  // 1. TOKENS FROM THEME
  // ============================================

  describe('tokens from theme', () => {
    it('resolves tokens from theme.components[name].variants.default', async () => {
      const theme = tokenTheme({ alpha: 'AAA', beta: 'BBB', gamma: 'CCC' });
      const node = component(TOKEN_COMP as any, { label: 'test' });
      const expanded = await componentRegistry.expandTree(node, { theme, render: noopRender() }) as any;
      assert.strictEqual(expanded._tokens.alpha, 'AAA');
      assert.strictEqual(expanded._tokens.beta, 'BBB');
      assert.strictEqual(expanded._tokens.gamma, 'CCC');
    });

    it('custom token values from theme are used', async () => {
      const theme = tokenTheme({ alpha: 'CUSTOM', beta: 'VALUES', gamma: 'HERE' });
      const node = component(TOKEN_COMP as any, { label: 'test' });
      const expanded = await componentRegistry.expandTree(node, { theme, render: noopRender() }) as any;
      assert.strictEqual(expanded._tokens.alpha, 'CUSTOM');
      assert.strictEqual(expanded._tokens.beta, 'VALUES');
      assert.strictEqual(expanded._tokens.gamma, 'HERE');
    });
  });

  // ============================================
  // 2. VARIANT RESOLUTION
  // ============================================

  describe('variant resolution', () => {
    it('default variant is used when no variant specified', async () => {
      const theme = tokenTheme({
        variants: {
          default: { alpha: 'def-A', beta: 'def-B', gamma: 'def-G' },
          alt: { alpha: 'alt-A', beta: 'alt-B', gamma: 'alt-G' },
        },
      });
      const node = component(TOKEN_COMP as any, { label: 'test' });
      const expanded = await componentRegistry.expandTree(node, { theme, render: noopRender() }) as any;
      assert.strictEqual(expanded._tokens.alpha, 'def-A');
      assert.strictEqual(expanded._tokens.beta, 'def-B');
    });

    it('non-default variant tokens are resolved when requested', async () => {
      const theme = tokenTheme({
        variants: {
          default: { alpha: 'def-A', beta: 'def-B', gamma: 'def-G' },
          alt: { alpha: 'alt-A', beta: 'alt-B', gamma: 'alt-G' },
        },
      });
      const node = component(TOKEN_COMP as any, { label: 'test', variant: 'alt' });
      const expanded = await componentRegistry.expandTree(node, { theme, render: noopRender() }) as any;
      assert.strictEqual(expanded._tokens.alpha, 'alt-A');
      assert.strictEqual(expanded._tokens.beta, 'alt-B');
      assert.strictEqual(expanded._tokens.gamma, 'alt-G');
    });

    it('each variant provides independent token set', async () => {
      const theme = tokenTheme({
        variants: {
          default: { alpha: 'BASE-A', beta: 'BASE-B', gamma: 'BASE-G' },
          special: { alpha: 'SPECIAL-A', beta: 'SPECIAL-B', gamma: 'SPECIAL-G' },
        },
      });
      const node = component(TOKEN_COMP as any, { label: 'test', variant: 'special' });
      const expanded = await componentRegistry.expandTree(node, { theme, render: noopRender() }) as any;
      assert.strictEqual(expanded._tokens.alpha, 'SPECIAL-A');
      assert.strictEqual(expanded._tokens.beta, 'SPECIAL-B');
    });

    it('no variant requested → default variant only', async () => {
      const theme = tokenTheme({
        variants: {
          default: { alpha: 'DEF-A', beta: 'DEF-B', gamma: 'DEF-G' },
          other: { alpha: 'OTHER-A', beta: 'OTHER-B', gamma: 'OTHER-G' },
        },
      });
      const node = component(TOKEN_COMP as any, { label: 'test' });
      const expanded = await componentRegistry.expandTree(node, { theme, render: noopRender() }) as any;
      assert.strictEqual(expanded._tokens.alpha, 'DEF-A');
    });
  });

  // ============================================
  // 3. UNKNOWN VARIANT ERROR
  // ============================================

  describe('unknown variant error', () => {
    it('throws with available variant names listed', async () => {
      const theme = tokenTheme({
        variants: {
          default: { alpha: 'A', beta: 'B', gamma: 'G' },
          clean: { alpha: 'A', beta: 'B', gamma: 'G' },
          minimal: { alpha: 'A', beta: 'B', gamma: 'G' },
        },
      });
      const node = component(TOKEN_COMP as any, { label: 'test', variant: 'nonexistent' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme, render: noopRender() }),
        (err: Error) => {
          assert.match(err.message, /Unknown variant 'nonexistent'/);
          assert.match(err.message, /clean/);
          assert.match(err.message, /minimal/);
          return true;
        },
      );
    });

    it('throws with default always listed', async () => {
      const theme = tokenTheme({ alpha: 'A', beta: 'B', gamma: 'G' });
      const node = component(TOKEN_COMP as any, { label: 'test', variant: 'anything' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme, render: noopRender() }),
        (err: Error) => {
          assert.match(err.message, /Unknown variant 'anything'/);
          assert.match(err.message, /default/);
          return true;
        },
      );
    });
  });

  // ============================================
  // 4. REQUIRED TOKEN VALIDATION (FAIL-FAST)
  // ============================================

  describe('required token validation', () => {
    it('throws when theme.components entry is missing entirely', async () => {
      const theme = mockTheme();
      // test-token-engine is not a standard component, so it's not in defaults
      const node = component(TOKEN_COMP as any, { label: 'test' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme, render: noopRender() }),
        (err: Error) => {
          assert.match(err.message, /requires theme tokens/);
          return true;
        },
      );
    });

    it('throws when a required token is missing', async () => {
      const theme = tokenTheme({
        variants: {
          default: { alpha: 'A', beta: 'B' }, // gamma missing
        },
      });
      const node = component(TOKEN_COMP as any, { label: 'test' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme, render: noopRender() }),
        (err: Error) => {
          assert.match(err.message, /missing required tokens/);
          assert.match(err.message, /gamma/);
          return true;
        },
      );
    });

    it('error message lists ALL missing tokens', async () => {
      const theme = tokenTheme({
        variants: {
          default: { alpha: 'A' }, // beta and gamma missing
        },
      });
      const node = component(TOKEN_COMP as any, { label: 'test' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme, render: noopRender() }),
        (err: Error) => {
          assert.match(err.message, /beta/);
          assert.match(err.message, /gamma/);
          return true;
        },
      );
    });

    it('succeeds when all required tokens are provided', async () => {
      const theme = tokenTheme({ alpha: 'A', beta: 'B', gamma: 'G' });
      const node = component(TOKEN_COMP as any, { label: 'test' });
      const expanded = await componentRegistry.expandTree(node, { theme, render: noopRender() });
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });
  });
});
