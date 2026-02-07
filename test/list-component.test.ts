import { describe, it } from 'node:test';
import assert from 'node:assert';
import { listComponent, bulletListComponent, numberedListComponent } from '../src/components/list.js';
import { componentRegistry } from '../src/core/component-registry.js';
import type { ColumnNode, RowNode, TextNode } from '../src/core/nodes.js';
import { mockTheme, mockMeasurer } from './mocks.js';
import { GAP, TEXT_STYLE } from '../src/core/types.js';

describe('List Component', () => {
  const theme = mockTheme();
  const measurer = mockMeasurer({ lineHeight: 0.5, lines: 1 });

  describe('registration', () => {
    it('should auto-register on import', () => {
      assert.ok(componentRegistry.has('list'));
    });
  });

  describe('listComponent DSL function', () => {
    it('should create a component node with correct type', () => {
      const node = listComponent({ items: ['Item 1', 'Item 2'] });
      assert.strictEqual(node.type, 'component');
      assert.strictEqual(node.componentName, 'list');
    });

    it('should pass items in props', () => {
      const items = ['A', 'B', 'C'];
      const node = listComponent({ items });
      assert.deepStrictEqual(node.props.items, items);
    });

    it('should pass through optional props', () => {
      const node = listComponent({
        items: ['A'],
        ordered: true,
        style: TEXT_STYLE.SMALL,
        color: '#FF0000',
      });
      assert.strictEqual(node.props.ordered, true);
      assert.strictEqual(node.props.style, TEXT_STYLE.SMALL);
      assert.strictEqual(node.props.color, '#FF0000');
    });
  });

  describe('bulletListComponent', () => {
    it('should set ordered to false', () => {
      const node = bulletListComponent({ items: ['A', 'B'] });
      assert.strictEqual(node.props.ordered, false);
    });

    it('should pass through other props', () => {
      const node = bulletListComponent({ items: ['A'], color: '#00FF00' });
      assert.strictEqual(node.props.color, '#00FF00');
      assert.strictEqual(node.props.ordered, false);
    });
  });

  describe('numberedListComponent', () => {
    it('should set ordered to true', () => {
      const node = numberedListComponent({ items: ['A', 'B'] });
      assert.strictEqual(node.props.ordered, true);
    });

    it('should pass through other props', () => {
      const node = numberedListComponent({ items: ['A'], color: '#0000FF' });
      assert.strictEqual(node.props.color, '#0000FF');
      assert.strictEqual(node.props.ordered, true);
    });
  });

  describe('expansion', () => {
    it('should expand to column with rows', () => {
      const node = listComponent({ items: ['Item 1', 'Item 2'] });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      assert.strictEqual(expanded.type, 'column');
      assert.strictEqual(expanded.children.length, 2);
      assert.strictEqual(expanded.children[0].type, 'row');
      assert.strictEqual(expanded.children[1].type, 'row');
    });

    it('should return empty column for empty items', () => {
      const node = listComponent({ items: [] });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      assert.strictEqual(expanded.type, 'column');
      assert.strictEqual(expanded.children.length, 0);
    });

    it('should create bullet markers for unordered list', () => {
      const node = listComponent({ items: ['A', 'B'], ordered: false });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      // Each row has: column(bullet), text(content)
      const firstRow = expanded.children[0] as RowNode;
      const bulletColumn = firstRow.children[0] as ColumnNode;
      const bulletText = bulletColumn.children[0] as TextNode;

      assert.strictEqual(bulletText.type, 'text');
      assert.strictEqual(bulletText.content, '•');
    });

    it('should create numbered markers for ordered list', () => {
      const node = listComponent({ items: ['A', 'B', 'C'], ordered: true });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      const row1 = expanded.children[0] as RowNode;
      const row2 = expanded.children[1] as RowNode;
      const row3 = expanded.children[2] as RowNode;

      assert.strictEqual((((row1.children[0] as ColumnNode).children[0]) as TextNode).content, '1.');
      assert.strictEqual((((row2.children[0] as ColumnNode).children[0]) as TextNode).content, '2.');
      assert.strictEqual((((row3.children[0] as ColumnNode).children[0]) as TextNode).content, '3.');
    });

    it('should include item content as text node', () => {
      const node = listComponent({ items: ['Hello World'] });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      const firstRow = expanded.children[0] as RowNode;
      const contentText = firstRow.children[1] as TextNode; // Second child is content

      assert.strictEqual(contentText.type, 'text');
      assert.strictEqual(contentText.content, 'Hello World');
    });

    it('should pass through TextNode items', () => {
      const textNode = { type: 'text' as const, content: 'Styled text', style: TEXT_STYLE.H4 };
      const node = listComponent({ items: [textNode] });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      const firstRow = expanded.children[0] as RowNode;
      const contentText = firstRow.children[1] as TextNode;

      assert.strictEqual(contentText.type, 'text');
      assert.strictEqual(contentText.content, 'Styled text');
      assert.strictEqual(contentText.style, TEXT_STYLE.H4);
    });
  });

  describe('styling options', () => {
    it('should apply color to items', () => {
      const node = listComponent({ items: ['A'], color: '#123456' });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      const firstRow = expanded.children[0] as RowNode;
      const contentText = firstRow.children[1] as TextNode;

      assert.strictEqual(contentText.color, '#123456');
    });

    it('should apply markerColor to bullets', () => {
      const node = listComponent({ items: ['A'], markerColor: '#AABBCC' });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      const firstRow = expanded.children[0] as RowNode;
      const bulletColumn = firstRow.children[0] as ColumnNode;
      const bulletText = bulletColumn.children[0] as TextNode;

      assert.strictEqual(bulletText.color, '#AABBCC');
    });

    it('should use color for marker when markerColor not specified', () => {
      const node = listComponent({ items: ['A'], color: '#FF0000' });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      const firstRow = expanded.children[0] as RowNode;
      const bulletColumn = firstRow.children[0] as ColumnNode;
      const bulletText = bulletColumn.children[0] as TextNode;

      assert.strictEqual(bulletText.color, '#FF0000');
    });

    it('should apply text style', () => {
      const node = listComponent({ items: ['A'], style: TEXT_STYLE.SMALL });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      const firstRow = expanded.children[0] as RowNode;
      const bulletColumn = firstRow.children[0] as ColumnNode;
      const bulletText = bulletColumn.children[0] as TextNode;
      const contentText = firstRow.children[1] as TextNode;

      assert.strictEqual(bulletText.style, TEXT_STYLE.SMALL);
      assert.strictEqual(contentText.style, TEXT_STYLE.SMALL);
    });

    it('should apply gap between items', () => {
      const node = listComponent({ items: ['A', 'B'], gap: GAP.LOOSE });
      const expanded = componentRegistry.expand(node, { theme, measurer }) as ColumnNode;

      assert.strictEqual(expanded.gap, GAP.LOOSE);
    });
  });
});
