import { describe, it } from 'node:test';
import assert from 'node:assert';
import { card } from '../src/card.js';
import { componentRegistry, NODE_TYPE } from 'tycoslide';
import { Component } from '../src/names.js';
import { mockTheme, noopCanvas } from './mocks.js';

describe('Card Component', () => {
  const theme = mockTheme();

  describe('registration', () => {
    it('should be registered at import time', () => {
      assert.ok(componentRegistry.has(Component.Card));
    });
  });

  describe('card DSL function', () => {
    it('should create a component node with correct type', () => {
      const node = card({ title: 'Test' });
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, Component.Card);
    });

    it('should pass props correctly', () => {
      const node = card({
        title: 'My Title',
        description: 'My description',
      });
      assert.strictEqual(node.props.title, 'My Title');
      assert.strictEqual(node.props.description, 'My description');
    });
  });

  describe('expansion', () => {
    it('should expand to stack with background and content', async () => {
      const node = card({ title: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

      // With background (default): stack(rectangle, column)
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        assert.strictEqual(expanded.children.length, 2);
        assert.strictEqual(expanded.children[0].type, NODE_TYPE.SHAPE);
        assert.strictEqual(expanded.children[1].type, NODE_TYPE.CONTAINER);
      }
    });

    it('should expand to column only when variant has backgroundOpacity=0', async () => {
      const flatTheme = mockTheme({ components: { card: { variants: { flat: { backgroundOpacity: 0 } } } } });
      const node = card({ title: 'Test', variant: 'flat' });
      const expanded = await componentRegistry.expandTree(node, { theme: flatTheme, canvas: noopCanvas() });

      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    });

    it('should build children from title prop', async () => {
      const node = card({ title: 'My Title' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

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

    it('should build children from title and description props', async () => {
      const node = card({
        title: 'Title',
        description: 'Description',
      });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

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

    it('should return empty column when no content', async () => {
      const node = card({});
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

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
});
