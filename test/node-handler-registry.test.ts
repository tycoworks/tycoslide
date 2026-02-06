// NodeHandlerRegistry unit tests

import { describe, test, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import { nodeHandlerRegistry, type NodeHandler, type LayoutContext } from '../src/core/layout/index.js';
import { NODE_TYPE, type LineNode, type PositionedNode } from '../src/core/nodes.js';
import type { Bounds } from '../src/core/bounds.js';
import type { Theme } from '../src/core/types.js';
import type { Canvas } from '../src/core/canvas.js';

// ============================================
// MOCK HANDLER
// ============================================

function createMockHandler(nodeType: string): NodeHandler<LineNode> {
  return {
    nodeType: nodeType as typeof NODE_TYPE.LINE,
    getHeight: () => 0.01,
    computeLayout: (node, bounds) => ({
      node,
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: 0.01,
    }),
    render: () => {},
  };
}

describe('NodeHandlerRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    nodeHandlerRegistry.clear();
  });

  // ============================================
  // REGISTRATION
  // ============================================

  describe('registration', () => {
    test('register adds handler to registry', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      nodeHandlerRegistry.register(handler);
      assert.ok(nodeHandlerRegistry.has(NODE_TYPE.LINE));
    });

    test('register throws on duplicate registration', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      nodeHandlerRegistry.register(handler);
      assert.throws(
        () => nodeHandlerRegistry.register(handler),
        /Handler already registered for node type: line/
      );
    });

    test('has returns false for unregistered type', () => {
      assert.strictEqual(nodeHandlerRegistry.has(NODE_TYPE.TEXT), false);
    });
  });

  // ============================================
  // RETRIEVAL
  // ============================================

  describe('retrieval', () => {
    test('get returns registered handler', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      nodeHandlerRegistry.register(handler);
      const retrieved = nodeHandlerRegistry.get(NODE_TYPE.LINE);
      assert.strictEqual(retrieved, handler);
    });

    test('get returns undefined for unregistered type', () => {
      const retrieved = nodeHandlerRegistry.get(NODE_TYPE.TEXT);
      assert.strictEqual(retrieved, undefined);
    });

    test('getOrThrow returns registered handler', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      nodeHandlerRegistry.register(handler);
      const retrieved = nodeHandlerRegistry.getOrThrow(NODE_TYPE.LINE);
      assert.strictEqual(retrieved, handler);
    });

    test('getOrThrow throws for unregistered type', () => {
      assert.throws(
        () => nodeHandlerRegistry.getOrThrow(NODE_TYPE.TEXT),
        /No handler registered for node type: text/
      );
    });
  });

  // ============================================
  // DELEGATION METHODS
  // ============================================

  describe('delegation', () => {
    test('getHeight delegates to handler', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      handler.getHeight = () => 0.05;
      nodeHandlerRegistry.register(handler);

      const node: LineNode = { type: NODE_TYPE.LINE };
      const result = nodeHandlerRegistry.getHeight(node, 10, {} as LayoutContext);
      assert.strictEqual(result, 0.05);
    });

    test('getHeight returns undefined for unregistered type', () => {
      const node: LineNode = { type: NODE_TYPE.LINE };
      const result = nodeHandlerRegistry.getHeight(node, 10, {} as LayoutContext);
      assert.strictEqual(result, undefined);
    });

    test('getMinHeight delegates to handler.getMinHeight if present', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      handler.getMinHeight = () => 0.02;
      nodeHandlerRegistry.register(handler);

      const node: LineNode = { type: NODE_TYPE.LINE };
      const result = nodeHandlerRegistry.getMinHeight(node, 10, {} as LayoutContext);
      assert.strictEqual(result, 0.02);
    });

    test('getMinHeight falls back to getHeight if getMinHeight not implemented', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      handler.getHeight = () => 0.05;
      nodeHandlerRegistry.register(handler);

      const node: LineNode = { type: NODE_TYPE.LINE };
      const result = nodeHandlerRegistry.getMinHeight(node, 10, {} as LayoutContext);
      assert.strictEqual(result, 0.05);
    });

    test('render returns true when handler exists', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      let rendered = false;
      handler.render = () => { rendered = true; };
      nodeHandlerRegistry.register(handler);

      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.LINE },
        x: 0, y: 0, width: 10, height: 0.01,
      };
      const result = nodeHandlerRegistry.render(positioned, {} as Canvas, {} as Theme);
      assert.strictEqual(result, true);
      assert.strictEqual(rendered, true);
    });

    test('render returns false when no handler', () => {
      const positioned: PositionedNode = {
        node: { type: NODE_TYPE.LINE },
        x: 0, y: 0, width: 10, height: 0.01,
      };
      const result = nodeHandlerRegistry.render(positioned, {} as Canvas, {} as Theme);
      assert.strictEqual(result, false);
    });
  });

  // ============================================
  // UTILITY METHODS
  // ============================================

  describe('utility', () => {
    test('clear removes all handlers', () => {
      nodeHandlerRegistry.register(createMockHandler(NODE_TYPE.LINE));
      assert.ok(nodeHandlerRegistry.has(NODE_TYPE.LINE));

      nodeHandlerRegistry.clear();
      assert.strictEqual(nodeHandlerRegistry.has(NODE_TYPE.LINE), false);
    });

    test('getRegisteredTypes returns all registered types', () => {
      nodeHandlerRegistry.register(createMockHandler(NODE_TYPE.LINE));
      nodeHandlerRegistry.register(createMockHandler(NODE_TYPE.RECTANGLE));

      const types = nodeHandlerRegistry.getRegisteredTypes();
      assert.deepStrictEqual(types.sort(), [NODE_TYPE.LINE, NODE_TYPE.RECTANGLE].sort());
    });

    test('getRegisteredTypes returns empty array when no handlers', () => {
      const types = nodeHandlerRegistry.getRegisteredTypes();
      assert.deepStrictEqual(types, []);
    });
  });
});
