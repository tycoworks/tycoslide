import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Registry, componentRegistry, isComponentNode, component, type LayoutDefinition } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import type { Slide } from '../src/presentation.js';
import { mockTheme } from './mocks.js';

// Import DSL modules to trigger component registration
import '../src/dsl/text.js';
import '../src/dsl/card.js';
import '../src/dsl/containers.js';
import { Component } from '../src/core/types.js';

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
      // text() is registered at import time — use it as a real component
      const node = component(Component.Text, { content: 'hello' });
      const expanded = await componentRegistry.expand(node, { theme });
      assert.strictEqual((expanded as any).type, NODE_TYPE.TEXT);
    });

    test('throws for unknown component', async () => {
      const node = component('nonexistent-component', {});
      await assert.rejects(
        () => componentRegistry.expand(node, { theme }),
        /Unknown component: 'nonexistent-component'/,
      );
    });
  });

  describe('expandTree', () => {
    test('passes primitives through unchanged', async () => {
      const textNode = { type: NODE_TYPE.TEXT, content: [], style: undefined, color: undefined, hAlign: 'left' as any, vAlign: 'top' as any };
      const result = await componentRegistry.expandTree(textNode, { theme });
      assert.strictEqual(result, textNode);
    });

    test('recursively expands nested components', async () => {
      // card expands to stack(shape, column(...)) — tests recursive expansion
      const node = component(Component.Card, { title: 'Test', background: false });
      const expanded = await componentRegistry.expandTree(node, { theme });
      // background=false means just a column with text child
      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
      if (expanded.type === NODE_TYPE.CONTAINER) {
        assert.strictEqual(expanded.children[0].type, NODE_TYPE.TEXT);
      }
    });

    test('recurses into element children', async () => {
      // A container with a component child should expand the child
      const node = component(Component.Row, { children: [component(Component.Text, { content: 'hi' })] });
      const expanded = await componentRegistry.expandTree(node, { theme });
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
});
