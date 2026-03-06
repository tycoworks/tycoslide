import { describe, it } from 'node:test';
import assert from 'node:assert';
import { quote } from '../src/quote.js';
import { componentRegistry, NODE_TYPE, TEXT_STYLE, HALIGN } from 'tycoslide';
import { Component } from '../src/names.js';
import { mockTheme, noopCanvas } from './mocks.js';
import {
  textComponent, imageComponent, cardComponent, quoteComponent,
  tableComponent, codeComponent, mermaidComponent,
  lineComponent, shapeComponent, slideNumberComponent,
  rowComponent, columnComponent, stackComponent, gridComponent,
  testimonialComponent, plainTextComponent,
} from '../src/index.js';

// Register components explicitly
componentRegistry.register([
  textComponent, imageComponent, cardComponent, quoteComponent,
  tableComponent, codeComponent, mermaidComponent,
  lineComponent, shapeComponent, slideNumberComponent,
  rowComponent, columnComponent, stackComponent, gridComponent,
  testimonialComponent, plainTextComponent,
]);

describe('Quote Component (Pull Quote)', () => {
  const theme = mockTheme();

  describe('registration', () => {
    it('should be registered after register()', () => {
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
    it('should expand to row with line (bar) and content column', async () => {
      const node = quote({ quote: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

      // row(line, column(text))
      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
      if (expanded.type === NODE_TYPE.CONTAINER) {
        assert.strictEqual(expanded.children.length, 2);
        // First child: the accent bar (line component, expanded)
        assert.strictEqual(expanded.children[0].type, NODE_TYPE.LINE);
        // Second child: content column
        assert.strictEqual(expanded.children[1].type, NODE_TYPE.CONTAINER);
      }
    });

    it('should apply bar tokens to the line node', async () => {
      const node = quote({ quote: 'Test' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
      if (expanded.type === NODE_TYPE.CONTAINER) {
        const bar = expanded.children[0];
        assert.strictEqual(bar.type, NODE_TYPE.LINE);
        if (bar.type === NODE_TYPE.LINE) {
          assert.strictEqual(bar.color, 'FF0000'); // mock theme barColor
          assert.strictEqual(bar.width, 3);         // mock theme barWidth
        }
      }
    });

    it('should include quote text as RICH content', async () => {
      const node = quote({ quote: 'A wise saying' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
      if (expanded.type === NODE_TYPE.CONTAINER) {
        const contentCol = expanded.children[1];
        assert.strictEqual(contentCol.type, NODE_TYPE.CONTAINER);
        if (contentCol.type === NODE_TYPE.CONTAINER) {
          assert.ok(contentCol.children.length >= 1);
          const quoteText = contentCol.children[0];
          assert.strictEqual(quoteText.type, NODE_TYPE.TEXT);
          if (quoteText.type === NODE_TYPE.TEXT) {
            const runs = quoteText.content as any[];
            assert.strictEqual(runs[0].text, 'A wise saying');
          }
        }
      }
    });

    it('should include attribution with LEFT alignment when provided', async () => {
      const node = quote({ quote: 'Quote text', attribution: '— Jane Smith' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
      if (expanded.type === NODE_TYPE.CONTAINER) {
        const contentCol = expanded.children[1];
        assert.strictEqual(contentCol.type, NODE_TYPE.CONTAINER);
        if (contentCol.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentCol.children.length, 2);
          const attribution = contentCol.children[1];
          assert.strictEqual(attribution.type, NODE_TYPE.TEXT);
          if (attribution.type === NODE_TYPE.TEXT) {
            const runs = attribution.content as any[];
            assert.strictEqual(runs[0].text, '— Jane Smith');
            assert.strictEqual(attribution.hAlign, HALIGN.LEFT);
            assert.strictEqual(attribution.style, TEXT_STYLE.SMALL);
          }
        }
      }
    });

    it('should have only quote text when no attribution', async () => {
      const node = quote({ quote: 'Just a quote' });
      const expanded = await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });

      assert.strictEqual(expanded.type, NODE_TYPE.CONTAINER);
      if (expanded.type === NODE_TYPE.CONTAINER) {
        const contentCol = expanded.children[1];
        assert.strictEqual(contentCol.type, NODE_TYPE.CONTAINER);
        if (contentCol.type === NODE_TYPE.CONTAINER) {
          assert.strictEqual(contentCol.children.length, 1);
          assert.strictEqual(contentCol.children[0].type, NODE_TYPE.TEXT);
        }
      }
    });

    it('should throw on missing quote text', () => {
      assert.rejects(async () => {
        const node = quote({});
        await componentRegistry.expandTree(node, { theme, canvas: noopCanvas() });
      }, /Quote component requires/);
    });
  });
});
