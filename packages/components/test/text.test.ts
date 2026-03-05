// Text Component Tests
// Tests for markdown expansion, text expansion, and DSL functions

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { text } from '../src/text.js';
import { CONTENT, HALIGN, VALIGN, NODE_TYPE, TEXT_STYLE, componentRegistry } from 'tycoslide';
import { Component } from '../src/names.js';
import type { NormalizedRun } from 'tycoslide';
import { mockTheme, noopCanvas } from './mocks.js';
import {
  textComponent, imageComponent, cardComponent, quoteComponent,
  tableComponent, codeComponent, mermaidComponent,
  lineComponent, shapeComponent, slideNumberComponent,
  rowComponent, columnComponent, stackComponent, gridComponent,
  listComponent,
} from '../src/index.js';

// Register components explicitly
componentRegistry.register([
  textComponent, imageComponent, cardComponent, quoteComponent,
  tableComponent, codeComponent, mermaidComponent,
  lineComponent, shapeComponent, slideNumberComponent,
  rowComponent, columnComponent, stackComponent, gridComponent,
  listComponent,
]);

// Test accents for directive resolution
const testAccents = {
  teal: '00CCCC',
  pink: 'FF00FF',
  orange: 'FF8800',
};

// Expected accent colors (text directives set color directly, no highlight background)
const expectedAccentColors = {
  teal: '00CCCC',
  pink: 'FF00FF',
  orange: 'FF8800',
};

function themeWithAccents() {
  return mockTheme({ accents: testAccents });
}

describe('Text', () => {
  describe('text() with CONTENT.PLAIN', () => {
    it('should create a component node with plain content kind', () => {
      const node = text('ARCHITECTURE', { content: CONTENT.PLAIN });
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, Component.Text);
      assert.strictEqual(node.props.body, 'ARCHITECTURE');
      assert.strictEqual(node.props.content, CONTENT.PLAIN);
    });

    it('should pass props correctly', () => {
      const node = text('Label', { content: CONTENT.PLAIN, style: TEXT_STYLE.EYEBROW as any, color: 'FF0000' });
      assert.strictEqual(node.props.body, 'Label');
      assert.strictEqual(node.props.style, 'eyebrow');
      assert.strictEqual(node.props.color, 'FF0000');
    });
  });

  describe('CONTENT.PLAIN expansion', () => {
    const theme = themeWithAccents();

    it('should be available after register()', () => {
      assert.ok(componentRegistry.has(Component.Text));
    });

    it('should expand to a TextNode with single run', async () => {
      const node = text('Hello world', { content: CONTENT.PLAIN });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'Hello world');
    });

    it('should NOT parse markdown — bold stays literal', async () => {
      const node = text('**not bold**', { content: CONTENT.PLAIN });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, '**not bold**');
      assert.strictEqual(runs[0].bold, undefined);
    });

    it('should NOT parse directives — stays literal', async () => {
      const node = text(':teal[not highlighted]', { content: CONTENT.PLAIN });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, ':teal[not highlighted]');
      assert.strictEqual(runs[0].highlight, undefined);
    });

    it('should apply style, color, and alignment', async () => {
      const node = text('Label', { content: CONTENT.PLAIN, style: TEXT_STYLE.BODY as any, color: 'AABBCC', hAlign: HALIGN.CENTER as any, vAlign: VALIGN.MIDDLE as any });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() }) as any;
      assert.strictEqual(expanded.style, 'body');
      assert.strictEqual(expanded.color, 'AABBCC');
      assert.strictEqual(expanded.hAlign, HALIGN.CENTER);
      assert.strictEqual(expanded.vAlign, VALIGN.MIDDLE);
    });

    it('should default hAlign to LEFT and vAlign to TOP', async () => {
      const node = text('Label', { content: CONTENT.PLAIN });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() }) as any;
      assert.strictEqual(expanded.hAlign, HALIGN.LEFT);
      assert.strictEqual(expanded.vAlign, VALIGN.TOP);
    });
  });

  describe('text() — inline rich text', () => {
    const theme = themeWithAccents();

    function makeContext() {
      return { theme, canvas: noopCanvas() };
    }

    it('should create a text component node with rich content kind', () => {
      const node = text('Hello **world**');
      assert.strictEqual(node.componentName, Component.Text);
      assert.strictEqual(node.props.content, CONTENT.RICH);
    });

    it('should be registered', () => {
      assert.ok(componentRegistry.has(Component.Text));
    });

    it('should parse bold and italic', async () => {
      const node = text('Hello **world** and *italic*');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      assert.strictEqual(result.type, NODE_TYPE.TEXT);
      const runs = result.content as any[];
      assert.ok(runs.some((r: any) => r.bold === true));
      assert.ok(runs.some((r: any) => r.italic === true));
    });

    it('should parse color directives', async () => {
      const node = text(':teal[highlighted]');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as any[];
      assert.ok(runs.some((r: any) => r.color !== undefined));
    });

    it('should handle numbered text without creating ordered list', async () => {
      const node = text('1. Problem statement');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as any[];
      // Should be plain inline text, not a bullet
      assert.ok(runs.every((r: any) => !r.bullet));
      // First run text should start with "1. "
      assert.ok(runs[0].text.startsWith('1. '));
    });

    it('should treat bullet syntax as literal text (micromark disable prevents list parsing)', async () => {
      const node = text('- bullet item');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as any[];
      // Micromark disable prevents "- " from being parsed as a list, so it becomes literal text
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, '- bullet item');
      assert.ok(!runs[0].bullet);
    });

    it('should treat heading syntax as literal text', async () => {
      const node = text('# heading text');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as any[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, '# heading text');
    });

    it('should treat blockquote syntax as literal text', async () => {
      const node = text('> quoted text');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as any[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, '> quoted text');
    });

    it('should reject multiple paragraphs', async () => {
      const node = text('First\n\nSecond');
      await assert.rejects(
        () => componentRegistry.expandTree(node, makeContext()),
        (err: any) => {
          assert.ok(err.message.includes('list component'));
          return true;
        },
      );
    });

    it('should pass through style and color props', async () => {
      const node = text('test', { style: TEXT_STYLE.BODY as any, color: 'AABBCC' });
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      assert.strictEqual(result.style, 'body');
      assert.strictEqual(result.color, 'AABBCC');
    });

    it('should parse hyperlinks', async () => {
      const node = text('[Click here](https://example.com)');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as NormalizedRun[];
      assert.ok(runs.some((r) => r.hyperlink === 'https://example.com'));
      assert.ok(runs.some((r) => r.text === 'Click here'));
    });

    it('should parse strikethrough', async () => {
      const node = text('~~struck~~');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as NormalizedRun[];
      assert.ok(runs.some((r) => r.strikethrough === true && r.text === 'struck'));
    });

    it('should parse underline', async () => {
      const node = text('++underlined++');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as NormalizedRun[];
      assert.ok(runs.some((r) => r.underline === true && r.text === 'underlined'));
    });

    it('should compose bold + strikethrough + hyperlink', async () => {
      const node = text('[**~~bold struck link~~**](https://example.com)');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      const runs = result.content as NormalizedRun[];
      const composedRun = runs.find((r: NormalizedRun) => r.text === 'bold struck link');
      assert.ok(composedRun, 'Should have a composed run');
      assert.strictEqual(composedRun!.bold, true);
      assert.strictEqual(composedRun!.strikethrough, true);
      assert.strictEqual(composedRun!.hyperlink, 'https://example.com');
    });

    it('should resolve linkColor and linkUnderline from tokens', async () => {
      const node = text('[link](https://example.com)');
      const result = await componentRegistry.expandTree(node, makeContext()) as any;
      assert.strictEqual(result.linkColor, '0000FF');
      assert.strictEqual(result.linkUnderline, true);
    });
  });
});
