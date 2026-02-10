import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cardComponent } from '../src/components/card.js';
import { componentRegistry } from '../src/core/componentRegistry.js';
import { mockTheme } from './mocks.js';

describe('Card Component', () => {
  const theme = mockTheme();

  describe('registration', () => {
    it('should auto-register on import', () => {
      assert.ok(componentRegistry.has('card'));
    });
  });

  describe('cardComponent DSL function', () => {
    it('should create a component node with correct type', () => {
      const node = cardComponent({ title: 'Test' });
      assert.strictEqual(node.type, 'component');
      assert.strictEqual(node.componentName, 'card');
    });

    it('should pass props correctly', () => {
      const node = cardComponent({
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
      const node = cardComponent({ title: 'Test' });
      const expanded = componentRegistry.expand(node, { theme });

      // With background (default): stack(rectangle, column)
      assert.strictEqual(expanded.type, 'stack');
      assert.strictEqual(expanded.children.length, 2);
      assert.strictEqual(expanded.children[0].type, 'rectangle'); // background
      assert.strictEqual(expanded.children[1].type, 'column');    // content
    });

    it('should expand to column only when background=false', () => {
      const node = cardComponent({ title: 'Test', background: false });
      const expanded = componentRegistry.expand(node, { theme });

      // No background: just column
      assert.strictEqual(expanded.type, 'column');
    });

    it('should build children from title prop', () => {
      const node = cardComponent({ title: 'My Title' });
      const expanded = componentRegistry.expand(node, { theme });

      const contentColumn = expanded.children[1];
      assert.strictEqual(contentColumn.children.length, 1);
      assert.strictEqual(contentColumn.children[0].type, 'text');
      assert.strictEqual(contentColumn.children[0].content, 'My Title');
    });

    it('should build children from title and description props', () => {
      const node = cardComponent({
        title: 'Title',
        description: 'Description',
      });
      const expanded = componentRegistry.expand(node, { theme });

      const contentColumn = expanded.children[1];
      assert.strictEqual(contentColumn.children.length, 2);
      assert.strictEqual(contentColumn.children[0].content, 'Title');
      assert.strictEqual(contentColumn.children[1].content, 'Description');
    });

    it('should return empty column when no content', () => {
      const node = cardComponent({});
      const expanded = componentRegistry.expand(node, { theme });

      const contentColumn = expanded.children[1];
      assert.strictEqual(contentColumn.children.length, 0);
    });
  });

  describe('styling options', () => {
    it('should apply background color', () => {
      const node = cardComponent({
        title: 'Test',
        backgroundColor: '#AABBCC',
      });
      const expanded = componentRegistry.expand(node, { theme });

      const rect = expanded.children[0];
      assert.strictEqual(rect.fill?.color, '#AABBCC');
    });

    it('should apply background opacity', () => {
      const node = cardComponent({
        title: 'Test',
        backgroundOpacity: 50,
      });
      const expanded = componentRegistry.expand(node, { theme });

      const rect = expanded.children[0];
      assert.strictEqual(rect.fill?.opacity, 50);
    });

    it('should apply border properties', () => {
      const node = cardComponent({
        title: 'Test',
        borderColor: '#123456',
        borderWidth: 2,
      });
      const expanded = componentRegistry.expand(node, { theme });

      const rect = expanded.children[0];
      assert.strictEqual(rect.border?.color, '#123456');
      assert.strictEqual(rect.border?.width, 2);
    });

    it('should apply corner radius', () => {
      const node = cardComponent({
        title: 'Test',
        cornerRadius: 0.25,
      });
      const expanded = componentRegistry.expand(node, { theme });

      const rect = expanded.children[0];
      assert.strictEqual(rect.cornerRadius, 0.25);
    });

    it('should apply padding to content column', () => {
      const node = cardComponent({
        title: 'Test',
        padding: 0.5,
      });
      const expanded = componentRegistry.expand(node, { theme });

      const contentColumn = expanded.children[1];
      assert.strictEqual(contentColumn.padding, 0.5);
    });
  });
});
