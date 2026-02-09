// ElementHandlerRegistry unit tests

import { describe, test, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import { elementHandlerRegistry, type ElementHandler, type LayoutContext } from '../src/core/element-registry.js';
import { NODE_TYPE, type LineNode, type PositionedNode } from '../src/core/nodes.js';
import type { Bounds } from '../src/core/bounds.js';
import type { Theme } from '../src/core/types.js';

// ============================================
// MOCK HANDLER
// ============================================

function createMockHandler(nodeType: string): ElementHandler<LineNode> {
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
    getIntrinsicWidth: () => 0,
  };
}

describe('ElementHandlerRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    elementHandlerRegistry.clear();
  });

  // ============================================
  // REGISTRATION
  // ============================================

  describe('registration', () => {
    test('register adds handler to registry', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      elementHandlerRegistry.register(handler);
      assert.ok(elementHandlerRegistry.has(NODE_TYPE.LINE));
    });

    test('register throws on duplicate registration', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      elementHandlerRegistry.register(handler);
      assert.throws(
        () => elementHandlerRegistry.register(handler),
        /Handler already registered for node type: line/
      );
    });

    test('has returns false for unregistered type', () => {
      assert.strictEqual(elementHandlerRegistry.has(NODE_TYPE.TEXT), false);
    });
  });

  // ============================================
  // RETRIEVAL
  // ============================================

  describe('retrieval', () => {
    test('get returns registered handler', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      elementHandlerRegistry.register(handler);
      const retrieved = elementHandlerRegistry.get(NODE_TYPE.LINE);
      assert.strictEqual(retrieved, handler);
    });

    test('get returns undefined for unregistered type', () => {
      const retrieved = elementHandlerRegistry.get(NODE_TYPE.TEXT);
      assert.strictEqual(retrieved, undefined);
    });

    test('getOrThrow returns registered handler', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      elementHandlerRegistry.register(handler);
      const retrieved = elementHandlerRegistry.getOrThrow(NODE_TYPE.LINE);
      assert.strictEqual(retrieved, handler);
    });

    test('getOrThrow throws for unregistered type', () => {
      assert.throws(
        () => elementHandlerRegistry.getOrThrow(NODE_TYPE.TEXT),
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
      elementHandlerRegistry.register(handler);

      const node: LineNode = { type: NODE_TYPE.LINE };
      const result = elementHandlerRegistry.getHeight(node, 10, {} as LayoutContext);
      assert.strictEqual(result, 0.05);
    });

    test('getHeight returns undefined for unregistered type', () => {
      const node: LineNode = { type: NODE_TYPE.LINE };
      const result = elementHandlerRegistry.getHeight(node, 10, {} as LayoutContext);
      assert.strictEqual(result, undefined);
    });

    test('getMinHeight delegates to handler.getMinHeight if present', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      handler.getMinHeight = () => 0.02;
      elementHandlerRegistry.register(handler);

      const node: LineNode = { type: NODE_TYPE.LINE };
      const result = elementHandlerRegistry.getMinHeight(node, 10, {} as LayoutContext);
      assert.strictEqual(result, 0.02);
    });

    test('getMinHeight falls back to getHeight if getMinHeight not implemented', () => {
      const handler = createMockHandler(NODE_TYPE.LINE);
      handler.getHeight = () => 0.05;
      elementHandlerRegistry.register(handler);

      const node: LineNode = { type: NODE_TYPE.LINE };
      const result = elementHandlerRegistry.getMinHeight(node, 10, {} as LayoutContext);
      assert.strictEqual(result, 0.05);
    });

  });

  // ============================================
  // UTILITY METHODS
  // ============================================

  describe('utility', () => {
    test('clear removes all handlers', () => {
      elementHandlerRegistry.register(createMockHandler(NODE_TYPE.LINE));
      assert.ok(elementHandlerRegistry.has(NODE_TYPE.LINE));

      elementHandlerRegistry.clear();
      assert.strictEqual(elementHandlerRegistry.has(NODE_TYPE.LINE), false);
    });

    test('getRegisteredTypes returns all registered types', () => {
      elementHandlerRegistry.register(createMockHandler(NODE_TYPE.LINE));
      elementHandlerRegistry.register(createMockHandler(NODE_TYPE.RECTANGLE));

      const types = elementHandlerRegistry.getRegisteredTypes();
      assert.deepStrictEqual(types.sort(), [NODE_TYPE.LINE, NODE_TYPE.RECTANGLE].sort());
    });

    test('getRegisteredTypes returns empty array when no handlers', () => {
      const types = elementHandlerRegistry.getRegisteredTypes();
      assert.deepStrictEqual(types, []);
    });
  });
});
