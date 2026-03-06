// Token Resolution Engine Tests
// Tests the core token resolution mechanism: node.tokens and validation.
// Uses a simple inline test component — does NOT test specific component implementations.

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { componentRegistry, defineComponent, component } from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import { HALIGN, VALIGN } from '../src/core/model/types.js';
import { schema } from '../src/core/model/schema.js';
import { noopCanvas } from './mocks.js';
import type { Theme } from '../src/core/model/types.js';

// ============================================
// TEST COMPONENT WITH DECLARED TOKENS
// ============================================

const TOKEN_COMP = 'test-token-engine';

const tokenTestComponent = defineComponent({
  name: TOKEN_COMP as any,
  params: {
    label: schema.string().optional(),
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

componentRegistry.register(tokenTestComponent);

/** Minimal theme for tests (no layout tokens needed). */
function minimalTheme(): Theme {
  return {
    colors: {} as any,
    slide: { layout: 'LAYOUT_16x9', width: 10, height: 5.625 },
    spacing: {} as any,
    fonts: [],
    textStyles: {} as any,
    layouts: {},
    master: {},
  };
}

describe('Token Resolution Engine', () => {

  // ============================================
  // 1. TOKENS FROM node.tokens (primary path)
  // ============================================

  describe('tokens from node.tokens', () => {
    it('resolves tokens from node.tokens', async () => {
      const theme = minimalTheme();
      const node = component(TOKEN_COMP as any, { label: 'test' }, { alpha: 'AAA', beta: 'BBB', gamma: 'CCC' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() }) as any;
      assert.strictEqual(expanded._tokens.alpha, 'AAA');
      assert.strictEqual(expanded._tokens.beta, 'BBB');
      assert.strictEqual(expanded._tokens.gamma, 'CCC');
    });

    it('custom token values are passed through', async () => {
      const theme = minimalTheme();
      const node = component(TOKEN_COMP as any, { label: 'test' }, { alpha: 'CUSTOM', beta: 'VALUES', gamma: 'HERE' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() }) as any;
      assert.strictEqual(expanded._tokens.alpha, 'CUSTOM');
      assert.strictEqual(expanded._tokens.beta, 'VALUES');
      assert.strictEqual(expanded._tokens.gamma, 'HERE');
    });

    it('props and tokens are separate — no key conflicts', async () => {
      const theme = minimalTheme();
      // Simulate card-like scenario: props.alpha is a string, tokens.alpha is an object
      const node = component(TOKEN_COMP as any, { label: 'test', alpha: 'content-string' }, { alpha: { nested: true }, beta: 'B', gamma: 'G' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() }) as any;
      // tokens.alpha should be the object, not the string
      assert.deepStrictEqual(expanded._tokens.alpha, { nested: true });
    });
  });

  // ============================================
  // 2. REQUIRED TOKEN VALIDATION (FAIL-FAST)
  // ============================================

  describe('required token validation', () => {
    it('throws when no tokens are provided at all', async () => {
      const theme = minimalTheme();
      const node = component(TOKEN_COMP as any, { label: 'test' });

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme, canvas: noopCanvas() }),
        (err: Error) => {
          assert.match(err.message, /requires tokens but none were provided/);
          return true;
        },
      );
    });

    it('throws when a required token is missing from node.tokens', async () => {
      const theme = minimalTheme();
      const node = component(TOKEN_COMP as any, { label: 'test' }, { alpha: 'A', beta: 'B' }); // gamma missing

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme, canvas: noopCanvas() }),
        (err: Error) => {
          assert.match(err.message, /missing required tokens/);
          assert.match(err.message, /gamma/);
          return true;
        },
      );
    });

    it('error message lists ALL missing tokens', async () => {
      const theme = minimalTheme();
      const node = component(TOKEN_COMP as any, { label: 'test' }, { alpha: 'A' }); // beta and gamma missing

      await assert.rejects(
        () => componentRegistry.expandTree(node, { theme, canvas: noopCanvas() }),
        (err: Error) => {
          assert.match(err.message, /beta/);
          assert.match(err.message, /gamma/);
          return true;
        },
      );
    });

    it('succeeds when all required tokens are provided via node.tokens', async () => {
      const theme = minimalTheme();
      const node = component(TOKEN_COMP as any, { label: 'test' }, { alpha: 'A', beta: 'B', gamma: 'G' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });

    it('components with no tokens expand without error', async () => {
      const NO_TOKEN_COMP = 'test-no-tokens';
      const noTokenComp = defineComponent({
        name: NO_TOKEN_COMP as any,
        params: { value: schema.string().optional() },
        tokens: [],
        expand: (props: any): any => ({
          type: NODE_TYPE.TEXT,
          content: [{ text: props.value ?? '' }],
          hAlign: HALIGN.LEFT,
          vAlign: VALIGN.TOP,
        }),
      });
      componentRegistry.register(noTokenComp);

      const theme = minimalTheme();
      const node = component(NO_TOKEN_COMP as any, { value: 'hello' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });
  });
});
