import { describe, it } from 'node:test';
import assert from 'node:assert';
import { card, CARD_COMPONENT } from '../src/dsl/card.js';
import { componentRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { mockTheme } from './mocks.js';

describe('Card Component', () => {
  const theme = mockTheme();

  describe('registration', () => {
    it('should lazy-register on first use', () => {
      // Registry should be empty before first use
      componentRegistry.clear();
      assert.strictEqual(componentRegistry.has(CARD_COMPONENT), false);

      // Calling card() should trigger registration
      card({ title: 'Test' });
      assert.ok(componentRegistry.has(CARD_COMPONENT));
    });
  });

  describe('card DSL function', () => {
    it('should create a component node with correct type', () => {
      const node = card({ title: 'Test' });
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, CARD_COMPONENT);
    });

    it('should pass props correctly', () => {
      const node = card({
        title: 'My Title',
        description: 'My description',
        backgroundColor: '#FF0000',
      });
      assert.strictEqual(node.props.title, 'My Title');
      assert.strictEqual(node.props.description, 'My description');
      assert.strictEqual(node.props.backgroundColor, '#FF0000');
    });
  });

  describe('expansion', () => {
    it('should expand to stack with background and content', () => {
      const node = card({ title: 'Test' });
      const expanded = componentRegistry.expandTree(node, { theme });

      // With background (default): stack(rectangle, column)
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        assert.strictEqual(expanded.children.length, 2);
        assert.strictEqual(expanded.children[0].type, NODE_TYPE.SHAPE);
        assert.strictEqual(expanded.children[1].type, NODE_TYPE.CONTAINER);
      }
    });

    it('should expand to column only when background=false', () => {
      const node = card({ title: 'Test', background: false });
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    });

    it('should build children from title prop', () => {
      const node = card({ title: 'My Title' });
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 1);
          assert.strictEqual(contentColumn.children[0].type, NODE_TYPE.TEXT);
          if (contentColumn.children[0].type === NODE_TYPE.TEXT) {
            // After expandTree, content is NormalizedRun[]
            const runs = contentColumn.children[0].content as any[];
            assert.strictEqual(runs[0].text, 'My Title');
          }
        }
      }
    });

    it('should build children from title and description props', () => {
      const node = card({
        title: 'Title',
        description: 'Description',
      });
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 2);
          if (contentColumn.children[0].type === NODE_TYPE.TEXT) {
            const runs0 = contentColumn.children[0].content as any[];
            assert.strictEqual(runs0[0].text, 'Title');
          }
          if (contentColumn.children[1].type === NODE_TYPE.TEXT) {
            const runs1 = contentColumn.children[1].content as any[];
            assert.strictEqual(runs1[0].text, 'Description');
          }
        }
      }
    });

    it('should return empty column when no content', () => {
      const node = card({});
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 0);
        }
      }
    });
  });

  describe('styling options', () => {
    it('should apply background color', () => {
      const node = card({
        title: 'Test',
        backgroundColor: '#AABBCC',
      });
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.fill?.color, '#AABBCC');
        }
      }
    });

    it('should apply background opacity', () => {
      const node = card({
        title: 'Test',
        backgroundOpacity: 50,
      });
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.fill?.opacity, 50);
        }
      }
    });

    it('should apply border properties', () => {
      const node = card({
        title: 'Test',
        borderColor: '#123456',
        borderWidth: 2,
      });
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.border?.color, '#123456');
          assert.strictEqual(rect.border?.width, 2);
        }
      }
    });

    it('should apply corner radius', () => {
      const node = card({
        title: 'Test',
        cornerRadius: 0.25,
      });
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const rect = expanded.children[0];
        assert.strictEqual(rect.type, NODE_TYPE.SHAPE);
        if (rect.type === NODE_TYPE.SHAPE) {
          assert.strictEqual(rect.cornerRadius, 0.25);
        }
      }
    });

    it('should apply padding to content column', () => {
      const node = card({
        title: 'Test',
        padding: 0.5,
      });
      const expanded = componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.padding, 0.5);
        }
      }
    });
  });
});
