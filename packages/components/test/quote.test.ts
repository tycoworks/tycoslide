import { describe, it } from 'node:test';
import assert from 'node:assert';
import { quote } from '../src/quote.js';
import { componentRegistry, NODE_TYPE, TEXT_STYLE, HALIGN, VALIGN } from 'tycoslide';
import { Component } from '../src/names.js';
import { mockTheme } from './mocks.js';

describe('Quote Component', () => {
  const theme = mockTheme();

  describe('registration', () => {
    it('should be registered at import time', () => {
      assert.ok(componentRegistry.has(Component.Quote));
    });
  });

  describe('quote DSL function', () => {
    it('should create a component node with correct type', () => {
      const node = quote({ quote: 'Test quote' });
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, Component.Quote);
    });

    it('should pass props correctly', () => {
      const node = quote({
        quote: 'A great quote',
        attribution: '— Author',
      });
      assert.strictEqual(node.props.quote, 'A great quote');
      assert.strictEqual(node.props.attribution, '— Author');
    });
  });

  describe('expansion', () => {
    it('should expand to stack with background and content', async () => {
      const node = quote({ quote: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      // With background (default): stack(shape, column)
      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        assert.strictEqual(expanded.children.length, 2);
        assert.strictEqual(expanded.children[0].type, NODE_TYPE.SHAPE);
        assert.strictEqual(expanded.children[1].type, NODE_TYPE.CONTAINER);
      }
    });

    it('should expand to column only when variant has backgroundOpacity=0', async () => {
      const flatTheme = mockTheme({ components: { quote: { variants: { flat: { backgroundOpacity: 0 } } } } });
      const node = quote({ quote: 'Test', variant: 'flat' });
      const expanded = await componentRegistry.expandTree(node, { theme: flatTheme });

      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
    });

    it('should include quote text as markdown', async () => {
      const node = quote({ quote: 'A wise saying' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          // Quote text should be first child
          assert.ok(contentColumn.children.length >= 1);
          assert.strictEqual(contentColumn.children[0].type, NODE_TYPE.TEXT);
          if (contentColumn.children[0].type === NODE_TYPE.TEXT) {
            const runs = contentColumn.children[0].content as any[];
            assert.strictEqual(runs[0].text, 'A wise saying');
          }
        }
      }
    });

    it('should include attribution when provided', async () => {
      const node = quote({ quote: 'Quote text', attribution: '— Jane Smith' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 2);
          // Attribution is plain text with RIGHT alignment and SMALL style
          const attribution = contentColumn.children[1];
          assert.strictEqual(attribution.type, NODE_TYPE.TEXT);
          if (attribution.type === NODE_TYPE.TEXT) {
            const runs = attribution.content as any[];
            assert.strictEqual(runs[0].text, '— Jane Smith');
            assert.strictEqual(attribution.hAlign, HALIGN.RIGHT);
            assert.strictEqual(attribution.style, TEXT_STYLE.SMALL);
          }
        }
      }
    });

    it('should include image when provided', async () => {
      const node = quote({ quote: 'Quote text', image: 'logo.png' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 2);
          // Image is wrapped in a centering row
          assert.strictEqual(contentColumn.children[0].type, NODE_TYPE.CONTAINER);
          if (contentColumn.children[0].type === NODE_TYPE.CONTAINER) {
            assert.strictEqual(contentColumn.children[0].children[0].type, NODE_TYPE.IMAGE);
          }
          // Quote text is second
          assert.strictEqual(contentColumn.children[1].type, NODE_TYPE.TEXT);
        }
      }
    });

    it('should include all three children: image, quote, attribution', async () => {
      const node = quote({
        quote: 'Quote text',
        attribution: '— Author',
        image: 'logo.png',
      });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.children.length, 3);
          // Image is wrapped in a centering row
          assert.strictEqual(contentColumn.children[0].type, NODE_TYPE.CONTAINER);
          if (contentColumn.children[0].type === NODE_TYPE.CONTAINER) {
            assert.strictEqual(contentColumn.children[0].children[0].type, NODE_TYPE.IMAGE);
          }
          assert.strictEqual(contentColumn.children[1].type, NODE_TYPE.TEXT);
          assert.strictEqual(contentColumn.children[2].type, NODE_TYPE.TEXT);
        }
      }
    });

    it('should vertically center content', async () => {
      const node = quote({ quote: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme });

      assert.strictEqual(expanded.type, NODE_TYPE.STACK);
      if (expanded.type === NODE_TYPE.STACK) {
        const contentColumn = expanded.children[1];
        assert.strictEqual(contentColumn.type, NODE_TYPE.CONTAINER);
        if (contentColumn.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentColumn.vAlign, VALIGN.MIDDLE);
        }
      }
    });
  });
});
