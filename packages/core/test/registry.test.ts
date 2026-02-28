import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Registry, componentRegistry, isComponentNode, component, type LayoutDefinition } from '../src/core/rendering/registry.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import type { Slide } from '../src/core/model/types.js';
import { mockTheme, mockTextStyle, noopRender } from './mocks.js';

// Import test stubs to trigger component registration
import { C } from './test-components.js';
import { HALIGN, VALIGN, DEFAULT_VARIANT, TEXT_STYLE } from '../src/core/model/types.js';

// ============================================
// GENERIC REGISTRY BASE CLASS
// ============================================

// Minimal stub slide for testing
const stubSlide: Slide = { content: { type: NODE_TYPE.COMPONENT, componentName: 'test', props: {} } };

function makeLayout(name: string, render: (params: any) => Slide): LayoutDefinition {
  return {
    name,
    description: `Test layout: ${name}`,
    params: {} as any,
    render,
  };
}

describe('Registry (generic base class)', () => {
  let registry: Registry<LayoutDefinition>;

  beforeEach(() => {
    registry = new Registry<LayoutDefinition>('Layout', 'render');
  });

  test('register and retrieve a definition', () => {
    const layout = makeLayout('title', () => stubSlide);
    registry.register(layout);
    assert.strictEqual(registry.has('title'), true);
    assert.strictEqual(registry.get('title'), layout);
  });

  test('has() returns false for unregistered name', () => {
    assert.strictEqual(registry.has('nonexistent'), false);
  });

  test('get() returns undefined for unregistered name', () => {
    assert.strictEqual(registry.get('nonexistent'), undefined);
  });

  test('idempotent registration (same identity)', () => {
    const render = () => stubSlide;
    const layout = makeLayout('title', render);
    registry.register(layout);
    registry.register(layout); // should not throw
    assert.strictEqual(registry.has('title'), true);
  });

  test('throws on duplicate name with different identity', () => {
    registry.register(makeLayout('title', () => stubSlide));
    assert.throws(
      () => registry.register(makeLayout('title', () => stubSlide)),
      /already registered/,
    );
  });

  test('getRegisteredNames returns all names', () => {
    registry.register(makeLayout('title', () => stubSlide));
    registry.register(makeLayout('section', () => stubSlide));
    registry.register(makeLayout('content', () => stubSlide));
    const names = registry.getRegisteredNames();
    assert.deepStrictEqual(names.sort(), ['content', 'section', 'title']);
  });

  test('getAll returns all definitions', () => {
    const a = makeLayout('a', () => stubSlide);
    const b = makeLayout('b', () => stubSlide);
    registry.register(a);
    registry.register(b);
    const all = registry.getAll();
    assert.strictEqual(all.length, 2);
    assert.ok(all.includes(a));
    assert.ok(all.includes(b));
  });

  test('clear removes all definitions', () => {
    registry.register(makeLayout('title', () => stubSlide));
    registry.register(makeLayout('section', () => stubSlide));
    registry.clear();
    assert.strictEqual(registry.has('title'), false);
    assert.strictEqual(registry.has('section'), false);
    assert.deepStrictEqual(registry.getRegisteredNames(), []);
  });
});

// ============================================
// COMPONENT REGISTRY (expand / expandTree)
// ============================================

describe('ComponentRegistry', () => {
  const theme = mockTheme();

  describe('isComponentNode', () => {
    test('returns true for component nodes', () => {
      const node = component('test', { foo: 1 });
      assert.strictEqual(isComponentNode(node), true);
    });

    test('returns false for element nodes', () => {
      assert.strictEqual(isComponentNode({ type: NODE_TYPE.TEXT, content: [] }), false);
      assert.strictEqual(isComponentNode({ type: NODE_TYPE.CONTAINER }), false);
    });

    test('returns false for non-objects', () => {
      assert.strictEqual(isComponentNode(null), false);
      assert.strictEqual(isComponentNode(undefined), false);
      assert.strictEqual(isComponentNode('string'), false);
      assert.strictEqual(isComponentNode(42), false);
    });
  });

  describe('expand', () => {
    test('expands a registered component', async () => {
      // text component is registered at import time — use it as a real component
      const node = component(C.Text, { body: 'hello' });
      const expanded = await componentRegistry.expand(node, { theme, render: noopRender() });
      assert.strictEqual((expanded as any).type, NODE_TYPE.TEXT);
    });

    test('throws for unknown component', async () => {
      const node = component('nonexistent-component', {});
      await assert.rejects(
        () => componentRegistry.expand(node, { theme, render: noopRender() }),
        /Unknown component: 'nonexistent-component'/,
      );
    });
  });

  describe('expandTree', () => {
    test('passes primitives through unchanged', async () => {
      const textNode = { type: NODE_TYPE.TEXT, content: [], style: TEXT_STYLE.BODY, resolvedStyle: mockTextStyle, color: '000000', hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP, lineHeightMultiplier: 1.2, bulletIndentPt: 0 };
      const result = await componentRegistry.expandTree(textNode, { theme, render: noopRender() });
      assert.strictEqual(result, textNode);
    });

    test('recursively expands nested components', async () => {
      const flatTheme = mockTheme({ components: { card: { variants: { flat: { backgroundOpacity: 0 } } } } });
      const node = component(C.Card, { title: 'Test', variant: 'flat' });
      const expanded = await componentRegistry.expandTree(node, { theme: flatTheme, render: noopRender() });
      // backgroundOpacity=0 means just a column with label child
      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
      if (expanded.type === NODE_TYPE.CONTAINER) {
        assert.strictEqual(expanded.children[0].type, NODE_TYPE.TEXT);
      }
    });

    test('recurses into element children', async () => {
      // A container with a component child should expand the child
      const node = component(C.Row, { children: [component(C.Text, { body: 'hi' })] });
      const expanded = await componentRegistry.expandTree(node, { theme, render: noopRender() });
      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
      if (expanded.type === NODE_TYPE.CONTAINER) {
        assert.strictEqual(expanded.children[0].type, NODE_TYPE.TEXT);
      }
    });
  });

  describe('component() helper', () => {
    test('creates a ComponentNode with correct shape', () => {
      const node = component('myComp', { x: 1 });
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, 'myComp');
      assert.deepStrictEqual(node.props, { x: 1 });
    });
  });

  describe('validateTheme', () => {
    test('passes for a valid theme', () => {
      const theme = mockTheme();
      assert.doesNotThrow(() => componentRegistry.validateTheme(theme));
    });

    test('throws when theme is missing tokens for a registered component', () => {
      const theme = mockTheme();
      // Remove a component that has required tokens
      delete (theme.components as any).text;
      assert.throws(
        () => componentRegistry.validateTheme(theme),
        /Theme missing tokens for component 'text'/,
      );
    });

    test('throws when theme is missing default variant', () => {
      const theme = mockTheme();
      // Replace variants with one that has no 'default' key
      (theme.components as any).text = { variants: { custom: { color: '000000' } } };
      assert.throws(
        () => componentRegistry.validateTheme(theme),
        /missing 'default' variant/,
      );
    });

    test('throws when a variant is missing required tokens', () => {
      const theme = mockTheme();
      // Add a variant that's missing some required tokens
      (theme.components as any).text.variants.incomplete = { color: '000000' };
      assert.throws(
        () => componentRegistry.validateTheme(theme),
        /missing required tokens/,
      );
    });
  });
});
