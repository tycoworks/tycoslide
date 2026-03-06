// Layout Token Tests
// Tests for Phase 1: Layout Token Infrastructure
// - LayoutRegistry.validateTheme() for layout tokens
// - LayoutRegistry.resolveTokens() for variant lookup
// - Slot token injection in documentCompiler
// - Backward compatibility (layouts without tokens)

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Registry, layoutRegistry, componentRegistry, defineLayout, isComponentNode } from '../src/core/rendering/registry.js';
import type { LayoutDefinition } from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import type { Slide } from '../src/core/model/types.js';
import { DEFAULT_VARIANT } from '../src/core/model/types.js';
import { mockTheme } from './mocks.js';
import { schema } from '../src/core/model/schema.js';
import { compileDocument } from '../src/core/markdown/documentCompiler.js';
import { testComponents } from './test-components.js';

// Register test components (idempotent — may already be registered by other test files)
componentRegistry.register(testComponents);

// ============================================
// LAYOUT TOKEN RESOLUTION (LayoutRegistry)
// ============================================

describe('LayoutRegistry.resolveTokens', () => {
  // Use a fresh registry for isolation
  let registry: InstanceType<typeof Registry<LayoutDefinition>>;

  beforeEach(() => {
    // We test resolveTokens on the singleton layoutRegistry
    // but the method only needs theme data, not registration state
  });

  it('resolves default variant tokens', () => {
    const theme = mockTheme({
      layouts: {
        title: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'FF0000', title: { style: 'h1', color: 'FFFFFF' } },
          },
        },
      },
    });
    const tokens = layoutRegistry.resolveTokens('title', DEFAULT_VARIANT, theme);
    assert.strictEqual(tokens.background, 'FF0000');
    assert.deepStrictEqual(tokens.title, { style: 'h1', color: 'FFFFFF' });
  });

  it('resolves non-default variant tokens', () => {
    const theme = mockTheme({
      layouts: {
        title: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'FF0000' },
            dark: { background: '000000' },
          },
        },
      },
    });
    const tokens = layoutRegistry.resolveTokens('title', 'dark', theme);
    assert.strictEqual(tokens.background, '000000');
  });

  it('throws when layout is not in theme.layouts', () => {
    const theme = mockTheme({ layouts: {} });
    assert.throws(
      () => layoutRegistry.resolveTokens('nonexistent', DEFAULT_VARIANT, theme),
      /theme\.layouts\.nonexistent is missing/,
    );
  });

  it('throws when theme has no layouts at all', () => {
    const theme = mockTheme();
    // theme.layouts is undefined by default
    assert.throws(
      () => layoutRegistry.resolveTokens('title', DEFAULT_VARIANT, theme),
      /theme\.layouts\.title is missing/,
    );
  });

  it('throws when requested variant does not exist', () => {
    const theme = mockTheme({
      layouts: {
        title: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'FF0000' },
          },
        },
      },
    });
    assert.throws(
      () => layoutRegistry.resolveTokens('title', 'nonexistent', theme),
      /Unknown variant 'nonexistent' for layout 'title'/,
    );
  });
});

// ============================================
// LAYOUT REGISTRY validateTheme
// ============================================

describe('LayoutRegistry.validateTheme', () => {
  // We need a fresh LayoutRegistry per test to control which layouts are registered.
  // Since LayoutRegistry is a class but not exported, we test via a standalone registry.
  // But validateTheme is on the LayoutRegistry class specifically.
  // Instead, register layouts on the singleton and clean up.

  // Use integration approach: register token-bearing layouts, validate, then
  // verify they pass or fail correctly.

  it('passes when theme provides all declared layout tokens', () => {
    const layout = defineLayout({
      name: 'tokenTest1',
      description: 'test',
      params: {},
      tokens: ['background', 'title'],
      render: () => ({ content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props: {} } }),
    });
    layoutRegistry.register(layout);

    const theme = mockTheme({
      layouts: {
        tokenTest1: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'FFFFFF', title: { style: 'h1' } },
          },
        },
      },
    });

    assert.doesNotThrow(() => layoutRegistry.validateTheme(theme, ['tokenTest1']));
  });

  it('throws when theme is missing layout tokens for a registered layout', () => {
    const layout = defineLayout({
      name: 'tokenTest2',
      description: 'test',
      params: {},
      tokens: ['background', 'title'],
      render: () => ({ content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props: {} } }),
    });
    layoutRegistry.register(layout);

    const theme = mockTheme({ layouts: {} });

    assert.throws(
      () => layoutRegistry.validateTheme(theme, ['tokenTest2']),
      /Theme missing layout tokens for layout 'tokenTest2'/,
    );
  });

  it('throws when a variant is missing required token keys', () => {
    const layout = defineLayout({
      name: 'tokenTest3',
      description: 'test',
      params: {},
      tokens: ['background', 'title'],
      render: () => ({ content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props: {} } }),
    });
    layoutRegistry.register(layout);

    const theme = mockTheme({
      layouts: {
        tokenTest3: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'FFFFFF' }, // missing 'title'
          },
        },
      },
    });

    assert.throws(
      () => layoutRegistry.validateTheme(theme, ['tokenTest3']),
      /Layout 'tokenTest3' variant 'default' is missing required tokens: \[title\]/,
    );
  });

  it('throws when default variant is missing', () => {
    const layout = defineLayout({
      name: 'tokenTest4',
      description: 'test',
      params: {},
      tokens: ['background'],
      render: () => ({ content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props: {} } }),
    });
    layoutRegistry.register(layout);

    const theme = mockTheme({
      layouts: {
        tokenTest4: {
          variants: {
            dark: { background: '000000' },
          },
        },
      },
    });

    assert.throws(
      () => layoutRegistry.validateTheme(theme, ['tokenTest4']),
      /missing 'default' variant for layout 'tokenTest4'/,
    );
  });

  it('skips layouts without tokens', () => {
    const layout = defineLayout({
      name: 'tokenTest5',
      description: 'test',
      params: {},
      render: () => ({ content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props: {} } }),
    });
    layoutRegistry.register(layout);

    // tokenTest5 has no tokens — validateTheme should not throw for it
    const theme = mockTheme();
    assert.doesNotThrow(() => layoutRegistry.validateTheme(theme, ['tokenTest5']));
  });
});

// ============================================
// DOCUMENT COMPILER: VARIANT + TOKEN PASSING
// ============================================

describe('Document Compiler: Layout Tokens', () => {
  const HEADER = `---\ntheme: test\n---\n\n`;
  let receivedProps: any[];
  let receivedTokens: any[];

  // Register a token-bearing layout for testing
  const tokenLayout = defineLayout({
    name: 'tokenBody',
    description: 'Test layout with tokens and body slot',
    params: { title: schema.string().optional() },
    slots: ['body'],
    tokens: ['background', 'title', 'text'],
    render: (props: any, tokens?: Record<string, unknown>): Slide => {
      receivedProps.push(props);
      receivedTokens.push(tokens);
      return { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
    },
  });

  const tokenNoSlotLayout = defineLayout({
    name: 'tokenSimple',
    description: 'Test layout with tokens but no slots',
    params: { title: schema.string() },
    tokens: ['background', 'titleTokens'],
    render: (props: any, tokens?: Record<string, unknown>): Slide => {
      receivedProps.push(props);
      receivedTokens.push(tokens);
      return { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
    },
  });

  layoutRegistry.register([tokenLayout, tokenNoSlotLayout]);

  beforeEach(() => {
    receivedProps = [];
    receivedTokens = [];
  });

  it('passes resolved tokens to layout render (no slots)', () => {
    const theme = mockTheme({
      layouts: {
        tokenSimple: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'AAAAAA', titleTokens: { style: 'h1', color: 'FFFFFF' } },
          },
        },
      },
    });

    const md = HEADER + `---\nlayout: tokenSimple\ntitle: Hello\n---`;
    compileDocument(md, { theme });

    assert.strictEqual(receivedTokens.length, 1);
    assert.strictEqual(receivedTokens[0].background, 'AAAAAA');
    assert.deepStrictEqual(receivedTokens[0].titleTokens, { style: 'h1', color: 'FFFFFF' });
  });

  it('passes resolved tokens with non-default variant', () => {
    const theme = mockTheme({
      layouts: {
        tokenSimple: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'AAAAAA', titleTokens: { style: 'h1' } },
            dark: { background: '000000', titleTokens: { style: 'h2' } },
          },
        },
      },
    });

    const md = HEADER + `---\nlayout: tokenSimple\ntitle: Hello\nvariant: dark\n---`;
    compileDocument(md, { theme });

    assert.strictEqual(receivedTokens.length, 1);
    assert.strictEqual(receivedTokens[0].background, '000000');
  });

  it('defaults to default variant when variant not specified', () => {
    const theme = mockTheme({
      layouts: {
        tokenSimple: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'FFFFFF', titleTokens: {} },
            dark: { background: '000000', titleTokens: {} },
          },
        },
      },
    });

    const md = HEADER + `---\nlayout: tokenSimple\ntitle: Hello\n---`;
    compileDocument(md, { theme });

    assert.strictEqual(receivedTokens[0].background, 'FFFFFF');
  });

  it('does not strip variant from params (it is a reserved key)', () => {
    const theme = mockTheme({
      layouts: {
        tokenSimple: {
          variants: {
            [DEFAULT_VARIANT]: { background: 'FFFFFF', titleTokens: {} },
            dark: { background: '000000', titleTokens: {} },
          },
        },
      },
    });

    const md = HEADER + `---\nlayout: tokenSimple\ntitle: Hello\nvariant: dark\n---`;
    // variant is reserved, so it should NOT appear in props passed to render
    // (it would fail validation if the layout doesn't declare it as a param)
    // But since tokenSimple doesn't have variant as a param, Zod strips it
    compileDocument(md, { theme });
    assert.strictEqual(receivedProps[0].variant, undefined);
  });

  it('backward compat: layout without tokens receives undefined tokens', () => {
    // Use the existing 'simple' layout registered in documentCompiler tests
    // which has no tokens
    let capturedTokens: any = 'NOT_CALLED';

    const noTokenLayout = defineLayout({
      name: 'noTokenTest',
      description: 'no tokens layout',
      params: { title: schema.string() },
      render: (props: any, tokens?: Record<string, unknown>): Slide => {
        capturedTokens = tokens;
        return { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
      },
    });
    layoutRegistry.register(noTokenLayout);

    const md = HEADER + `---\nlayout: noTokenTest\ntitle: Hello\n---`;
    compileDocument(md, { theme: mockTheme() });

    assert.strictEqual(capturedTokens, undefined);
  });
});

// ============================================
// SLOT TOKEN INJECTION
// ============================================

describe('Slot Token Injection', () => {
  const HEADER = `---\ntheme: test\n---\n\n`;
  let receivedProps: any[];
  let receivedTokens: any[];

  const slotTokenLayout = defineLayout({
    name: 'slotTokenTest',
    description: 'Layout with slot token injection',
    params: { title: schema.string().optional() },
    slots: ['body'],
    tokens: ['background', 'text'],
    render: (props: any, tokens?: Record<string, unknown>): Slide => {
      receivedProps.push(props);
      receivedTokens.push(tokens);
      return { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
    },
  });

  layoutRegistry.register(slotTokenLayout);

  beforeEach(() => {
    receivedProps = [];
    receivedTokens = [];
  });

  it('injects text tokens into slot-compiled text nodes', () => {
    const textTokens = { style: 'h2', color: 'FF0000', lineHeightMultiplier: 1.5 };
    const theme = mockTheme({
      layouts: {
        slotTokenTest: {
          variants: {
            [DEFAULT_VARIANT]: {
              background: 'FFFFFF',
              text: textTokens,
            },
          },
        },
      },
    });

    const md = HEADER + `---\nlayout: slotTokenTest\n---\n\nHello world`;
    compileDocument(md, { theme });

    assert.strictEqual(receivedProps.length, 1);
    const bodyNodes = receivedProps[0].body;
    assert.ok(Array.isArray(bodyNodes));
    assert.ok(bodyNodes.length > 0);

    // The first body node should be a text ComponentNode with injected tokens
    const textNode = bodyNodes[0];
    assert.ok(isComponentNode(textNode), 'body node should be a ComponentNode');
    assert.strictEqual(textNode.componentName, 'text');
    // Token values should be in node.tokens (not merged into props)
    const tokens = textNode.tokens as Record<string, unknown>;
    assert.ok(tokens, 'tokens should be set on the node');
    assert.strictEqual(tokens.style, 'h2');
    assert.strictEqual(tokens.color, 'FF0000');
    assert.strictEqual(tokens.lineHeightMultiplier, 1.5);
  });

  it('preserves explicit props over injected tokens', () => {
    const textTokens = { style: 'body', color: '000000' };
    const theme = mockTheme({
      layouts: {
        slotTokenTest: {
          variants: {
            [DEFAULT_VARIANT]: {
              background: 'FFFFFF',
              text: textTokens,
            },
          },
        },
      },
    });

    // Use a heading which sets style explicitly
    const md = HEADER + `---\nlayout: slotTokenTest\n---\n\n## Heading`;
    compileDocument(md, { theme });

    const bodyNodes = receivedProps[0].body;
    const textNode = bodyNodes[0];
    const tokens = textNode.tokens as Record<string, unknown>;
    assert.ok(tokens, 'tokens should be set on the node');
    // Heading mdast compile puts style:'h2' in node.tokens.
    // Slot injection merges: { ...layoutDefaults, ...nodeTokens }
    // So heading's 'h2' overrides layout's 'body'.
    assert.strictEqual(tokens.style, 'h2');
    assert.strictEqual(tokens.color, '000000');
  });

  it('does not inject tokens when layout has no token key matching component name', () => {
    const theme = mockTheme({
      layouts: {
        slotTokenTest: {
          variants: {
            [DEFAULT_VARIANT]: {
              background: 'FFFFFF',
              // No 'text' key — only 'background'
              text: undefined as any,  // explicitly undefined
            },
          },
        },
      },
    });

    // Remove the undefined key to truly test absence
    delete (theme.layouts as any).slotTokenTest.variants[DEFAULT_VARIANT].text;

    const md = HEADER + `---\nlayout: slotTokenTest\n---\n\nHello`;
    compileDocument(md, { theme });

    const bodyNodes = receivedProps[0].body;
    const textNode = bodyNodes[0];
    // No matching layout token key for 'text', so node.tokens should not be set
    assert.strictEqual(textNode.tokens, undefined);
    // Props should still have body content
    const props = textNode.props as Record<string, unknown>;
    assert.ok(props.body !== undefined);
  });

  it('does not inject tokens for layouts without slots', () => {
    let capturedProps: any;
    const noSlotTokenLayout = defineLayout({
      name: 'noSlotTokenTest',
      description: 'Tokens but no slots',
      params: { title: schema.string() },
      tokens: ['background', 'text'],
      render: (props: any, tokens?: Record<string, unknown>): Slide => {
        capturedProps = props;
        return { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props } };
      },
    });
    layoutRegistry.register(noSlotTokenLayout);

    const theme = mockTheme({
      layouts: {
        noSlotTokenTest: {
          variants: {
            [DEFAULT_VARIANT]: {
              background: 'FFFFFF',
              text: { style: 'body', color: '000000' },
            },
          },
        },
      },
    });

    const md = HEADER + `---\nlayout: noSlotTokenTest\ntitle: Hello\n---`;
    compileDocument(md, { theme });

    // Props should just be the validated params, no injection
    assert.strictEqual(capturedProps.title, 'Hello');
  });
});

// ============================================
// RESERVED FRONTMATTER KEYS
// ============================================

describe('RESERVED_FRONTMATTER_KEYS includes variant', () => {
  it('rejects layout param named variant', () => {
    assert.throws(
      () => defineLayout({
        name: 'badLayout',
        description: 'test',
        params: { variant: schema.string() },
        render: () => ({ content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props: {} } }),
      }),
      /reserved frontmatter key/,
    );
  });
});
