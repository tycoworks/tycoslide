// Text Component Tests
// Tests for markdown expansion, text expansion, and DSL functions

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { markdown, text } from '../src/dsl/text.js';
import { Component } from '../src/core/types.js';
import { componentRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import type { NormalizedRun } from '../src/core/types.js';
import { mockTheme } from './mocks.js';

// Test accents for directive resolution
const testAccents = {
  teal: '00CCCC',
  pink: 'FF00FF',
  orange: 'FF8800',
};

// Expected highlight pairs (derived: bg = colors.background, text = accent color)
const expectedHighlights = {
  teal: { bg: 'FFFFFF', text: '00CCCC' },
  pink: { bg: 'FFFFFF', text: 'FF00FF' },
  orange: { bg: 'FFFFFF', text: 'FF8800' },
};

function themeWithAccents() {
  return mockTheme({ accents: testAccents });
}

/** Helper: expand markdown and return runs */
async function expandMarkdownRuns(content: string, theme?: any): Promise<NormalizedRun[]> {
  const node = markdown(content);
  const expanded = await componentRegistry.expand(node, { theme: theme ?? themeWithAccents() }) as any;
  return expanded.content as NormalizedRun[];
}

describe('Text', () => {
  describe('markdown() DSL function', () => {
    it('should create a component node with correct type', () => {
      const node = markdown('Hello **world**');
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, Component.Markdown);
      assert.strictEqual(node.props.content, 'Hello **world**');
    });

    it('should pass props correctly', () => {
      const node = markdown('Content', { style: 'body' as any, color: 'FF0000' });
      assert.strictEqual(node.props.content, 'Content');
      assert.strictEqual(node.props.style, 'body');
      assert.strictEqual(node.props.color, 'FF0000');
    });
  });

  describe('markdown expansion', () => {
    const theme = themeWithAccents();

    it('should auto-register on import', () => {
      assert.ok(componentRegistry.has('markdown'));
    });

    it('should expand to a TextNode', async () => {
      const node = markdown('Hello **world**');
      const expanded = await componentRegistry.expand(node, { theme });
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });

    it('should expand plain text to a single run', async () => {
      const runs = await expandMarkdownRuns('Hello world');
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'Hello world');
    });

    it('should expand bold markdown to bold runs', async () => {
      const runs = await expandMarkdownRuns('Normal **bold** text');
      assert.strictEqual(runs.length, 3);
      assert.strictEqual(runs[0].text, 'Normal ');
      assert.strictEqual(runs[1].text, 'bold');
      assert.strictEqual(runs[1].bold, true);
      assert.strictEqual(runs[2].text, ' text');
    });

    it('should expand italic text', async () => {
      const runs = await expandMarkdownRuns('*italic text*');
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'italic text');
      assert.strictEqual(runs[0].italic, true);
    });

    it('should expand mixed inline formatting', async () => {
      const runs = await expandMarkdownRuns('Normal **bold** and *italic*');
      assert.strictEqual(runs.length, 4);
      assert.strictEqual(runs[0].text, 'Normal ');
      assert.strictEqual(runs[1].text, 'bold');
      assert.strictEqual(runs[1].bold, true);
      assert.strictEqual(runs[2].text, ' and ');
      assert.strictEqual(runs[3].text, 'italic');
      assert.strictEqual(runs[3].italic, true);
    });

    it('should expand bold+italic', async () => {
      const runs = await expandMarkdownRuns('***bold italic***');
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].bold, true);
      assert.strictEqual(runs[0].italic, true);
    });

    it('should expand unordered list to bullet runs', async () => {
      const runs = await expandMarkdownRuns('- First\n- Second\n- Third');
      assert.strictEqual(runs.length, 3);
      assert.strictEqual(runs[0].text, 'First');
      assert.strictEqual(runs[0].bullet, true);
      assert.strictEqual(runs[1].text, 'Second');
      assert.strictEqual(runs[1].bullet, true);
      assert.strictEqual(runs[2].text, 'Third');
      assert.strictEqual(runs[2].bullet, true);
    });

    it('should expand ordered list to numbered bullet runs', async () => {
      const runs = await expandMarkdownRuns('1. First\n2. Second');
      assert.strictEqual(runs.length, 2);
      assert.deepStrictEqual(runs[0].bullet, { type: 'number' });
      assert.deepStrictEqual(runs[1].bullet, { type: 'number' });
    });

    it('should add breakLine between paragraphs', async () => {
      const runs = await expandMarkdownRuns('First paragraph.\n\nSecond paragraph.');
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'First paragraph.');
      assert.strictEqual(runs[0].breakLine, undefined);
      assert.strictEqual(runs[1].text, 'Second paragraph.');
      assert.strictEqual(runs[1].breakLine, true);
    });

    it('should expand highlight directives using theme accents', async () => {
      const runs = await expandMarkdownRuns(':teal[highlighted text]');
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'highlighted text');
      assert.deepStrictEqual(runs[0].highlight, expectedHighlights.teal);
    });

    it('should handle bold inside highlight', async () => {
      const runs = await expandMarkdownRuns(':teal[**bold** highlight]');
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'bold');
      assert.strictEqual(runs[0].bold, true);
      assert.deepStrictEqual(runs[0].highlight, expectedHighlights.teal);
      assert.strictEqual(runs[1].text, ' highlight');
      assert.deepStrictEqual(runs[1].highlight, expectedHighlights.teal);
    });

    it('should throw on unknown accent name', async () => {
      await assert.rejects(
        () => expandMarkdownRuns(':unknown[text]'),
        /Unknown accent 'unknown'/
      );
    });

    it('should include available accents in error message', async () => {
      await assert.rejects(
        () => expandMarkdownRuns(':organge[text]'),
        /Available: teal, pink, orange/
      );
    });

    it('should handle paragraph + bullets + paragraph', async () => {
      const runs = await expandMarkdownRuns('Intro.\n\n- Bullet one\n- Bullet two\n\nConclusion.');
      assert.strictEqual(runs.length, 4);
      assert.strictEqual(runs[0].text, 'Intro.');
      assert.strictEqual(runs[1].text, 'Bullet one');
      assert.strictEqual(runs[1].bullet, true);
      assert.strictEqual(runs[2].text, 'Bullet two');
      assert.strictEqual(runs[2].bullet, true);
      assert.strictEqual(runs[3].text, 'Conclusion.');
      assert.strictEqual(runs[3].breakLine, true);
    });

    it('should handle bold inside bullet', async () => {
      const runs = await expandMarkdownRuns('- **Bold** bullet');
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'Bold');
      assert.strictEqual(runs[0].bold, true);
      assert.strictEqual(runs[0].bullet, true);
      assert.strictEqual(runs[1].text, ' bullet');
      assert.strictEqual(runs[1].bullet, undefined);
      assert.strictEqual(runs[1].bold, undefined);
    });

    it('should apply style and color props', async () => {
      const node = markdown('text', { style: 'body' as any, color: 'AABBCC' });
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.style, 'body');
      assert.strictEqual(expanded.color, 'AABBCC');
    });

    it('should default hAlign to LEFT and vAlign to TOP', async () => {
      const node = markdown('text');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.hAlign, 'left');
      assert.strictEqual(expanded.vAlign, 'top');
    });

    it('should apply bulletColor to bullet runs', async () => {
      const node = markdown('- First\n- Second', { bulletColor: 'FF0000' });
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.deepStrictEqual(runs[0].bullet, { color: 'FF0000' });
      assert.deepStrictEqual(runs[1].bullet, { color: 'FF0000' });
    });

    it('should expand full markdown document', async () => {
      const runs = await expandMarkdownRuns(`
Intro with **bold** and :teal[highlight].

- First bullet
- Second bullet with :pink[color]

Conclusion.
      `);

      assert.ok(runs.length >= 5, `Expected at least 5 runs, got ${runs.length}`);

      const highlightRun = runs.find(r => r.highlight);
      assert.ok(highlightRun, 'Should have a highlighted run');
      assert.deepStrictEqual(highlightRun!.highlight, expectedHighlights.teal);

      const bulletRuns = runs.filter(r => r.bullet);
      assert.ok(bulletRuns.length >= 2, `Expected at least 2 bullet runs, got ${bulletRuns.length}`);
    });
  });

  describe('text() DSL function', () => {
    it('should create a component node with text type', () => {
      const node = text('ARCHITECTURE');
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, Component.Text);
      assert.strictEqual(node.props.content, 'ARCHITECTURE');
    });

    it('should pass props correctly', () => {
      const node = text('Label', { style: 'eyebrow' as any, color: 'FF0000' });
      assert.strictEqual(node.props.content, 'Label');
      assert.strictEqual(node.props.style, 'eyebrow');
      assert.strictEqual(node.props.color, 'FF0000');
    });
  });

  describe('text() expansion (plain text)', () => {
    const theme = themeWithAccents();

    it('should auto-register on import', () => {
      assert.ok(componentRegistry.has('text'));
    });

    it('should expand to a TextNode with single run', async () => {
      const node = text('Hello world');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'Hello world');
    });

    it('should NOT parse markdown — bold stays literal', async () => {
      const node = text('**not bold**');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, '**not bold**');
      assert.strictEqual(runs[0].bold, undefined);
    });

    it('should NOT parse directives — stays literal', async () => {
      const node = text(':teal[not highlighted]');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, ':teal[not highlighted]');
      assert.strictEqual(runs[0].highlight, undefined);
    });

    it('should apply style, color, and alignment', async () => {
      const node = text('Label', { style: 'body' as any, color: 'AABBCC', hAlign: 'center' as any, vAlign: 'middle' as any });
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.style, 'body');
      assert.strictEqual(expanded.color, 'AABBCC');
      assert.strictEqual(expanded.hAlign, 'center');
      assert.strictEqual(expanded.vAlign, 'middle');
    });

    it('should default hAlign to LEFT and vAlign to TOP', async () => {
      const node = text('Label');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.hAlign, 'left');
      assert.strictEqual(expanded.vAlign, 'top');
    });
  });
});
