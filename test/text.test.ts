// Text Component Tests (formerly Markdown)
// Tests for parser, MDAST-to-runs transformer, component expansion, and DSL

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseMarkdown, mdastToRuns, text, plainText, TEXT_COMPONENT, PLAIN_TEXT_COMPONENT, MDAST } from '../src/dsl/text.js';
import { componentRegistry } from '../src/core/registry.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import type { NormalizedRun, HighlightScheme } from '../src/core/types.js';
import { mockTheme } from './mocks.js';

// Test highlights
const highlights: HighlightScheme = {
  teal: { bg: '003333', text: '00CCCC' },
  pink: { bg: '330033', text: 'FF00FF' },
  orange: { bg: '332200', text: 'FF8800' },
};

function themeWithHighlights() {
  return mockTheme({ highlights });
}

describe('Text', () => {
  describe('parseMarkdown', () => {
    it('should parse simple text into a paragraph', () => {
      const tree = parseMarkdown('Hello world');
      assert.strictEqual(tree.type, MDAST.ROOT);
      assert.strictEqual(tree.children.length, 1);
      assert.strictEqual(tree.children[0].type, MDAST.PARAGRAPH);
    });

    it('should parse bold text', () => {
      const tree = parseMarkdown('**bold**');
      const para = tree.children[0] as any;
      assert.strictEqual(para.children[0].type, MDAST.STRONG);
    });

    it('should parse italic text', () => {
      const tree = parseMarkdown('*italic*');
      const para = tree.children[0] as any;
      assert.strictEqual(para.children[0].type, MDAST.EMPHASIS);
    });

    it('should parse unordered list', () => {
      const tree = parseMarkdown('- item one\n- item two');
      assert.strictEqual(tree.children[0].type, MDAST.LIST);
      const list = tree.children[0] as any;
      assert.strictEqual(list.ordered, false);
      assert.strictEqual(list.children.length, 2);
    });

    it('should parse ordered list', () => {
      const tree = parseMarkdown('1. first\n2. second');
      const list = tree.children[0] as any;
      assert.strictEqual(list.ordered, true);
      assert.strictEqual(list.children.length, 2);
    });

    it('should parse text directive (:name[text])', () => {
      const tree = parseMarkdown(':teal[highlighted]');
      const para = tree.children[0] as any;
      assert.strictEqual(para.children[0].type, MDAST.TEXT_DIRECTIVE);
      assert.strictEqual(para.children[0].name, 'teal');
    });

    it('should parse multiple paragraphs', () => {
      const tree = parseMarkdown('First paragraph.\n\nSecond paragraph.');
      assert.strictEqual(tree.children.length, 2);
      assert.strictEqual(tree.children[0].type, MDAST.PARAGRAPH);
      assert.strictEqual(tree.children[1].type, MDAST.PARAGRAPH);
    });
  });

  describe('mdastToRuns', () => {
    it('should convert plain text to a single run', () => {
      const tree = parseMarkdown('Hello world');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'Hello world');
    });

    it('should convert bold text', () => {
      const tree = parseMarkdown('**bold text**');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'bold text');
      assert.strictEqual(runs[0].bold, true);
    });

    it('should convert italic text', () => {
      const tree = parseMarkdown('*italic text*');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'italic text');
      assert.strictEqual(runs[0].italic, true);
    });

    it('should convert mixed inline formatting', () => {
      const tree = parseMarkdown('Normal **bold** and *italic*');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 4);
      assert.strictEqual(runs[0].text, 'Normal ');
      assert.strictEqual(runs[0].bold, undefined);
      assert.strictEqual(runs[1].text, 'bold');
      assert.strictEqual(runs[1].bold, true);
      assert.strictEqual(runs[2].text, ' and ');
      assert.strictEqual(runs[3].text, 'italic');
      assert.strictEqual(runs[3].italic, true);
    });

    it('should convert bold+italic', () => {
      const tree = parseMarkdown('***bold italic***');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].bold, true);
      assert.strictEqual(runs[0].italic, true);
    });

    it('should convert unordered list to bullet runs', () => {
      const tree = parseMarkdown('- First\n- Second\n- Third');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 3);
      assert.strictEqual(runs[0].text, 'First');
      assert.strictEqual(runs[0].bullet, true);
      assert.strictEqual(runs[1].text, 'Second');
      assert.strictEqual(runs[1].bullet, true);
      assert.strictEqual(runs[2].text, 'Third');
      assert.strictEqual(runs[2].bullet, true);
    });

    it('should convert ordered list to numbered bullet runs', () => {
      const tree = parseMarkdown('1. First\n2. Second');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 2);
      assert.deepStrictEqual(runs[0].bullet, { type: 'number' });
      assert.deepStrictEqual(runs[1].bullet, { type: 'number' });
    });

    it('should add breakLine between paragraphs', () => {
      const tree = parseMarkdown('First paragraph.\n\nSecond paragraph.');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'First paragraph.');
      assert.strictEqual(runs[0].breakLine, undefined);
      assert.strictEqual(runs[1].text, 'Second paragraph.');
      assert.strictEqual(runs[1].breakLine, true);
    });

    it('should resolve text directive to highlight', () => {
      const tree = parseMarkdown(':teal[highlighted text]');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'highlighted text');
      assert.deepStrictEqual(runs[0].highlight, highlights.teal);
    });

    it('should handle bold inside highlight', () => {
      const tree = parseMarkdown(':teal[**bold** highlight]');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'bold');
      assert.strictEqual(runs[0].bold, true);
      assert.deepStrictEqual(runs[0].highlight, highlights.teal);
      assert.strictEqual(runs[1].text, ' highlight');
      assert.deepStrictEqual(runs[1].highlight, highlights.teal);
    });

    it('should throw on unknown highlight name', () => {
      const tree = parseMarkdown(':unknown[text]');
      assert.throws(
        () => mdastToRuns(tree, highlights),
        /Unknown highlight 'unknown'/
      );
    });

    it('should include available highlights in error message', () => {
      const tree = parseMarkdown(':organge[text]');
      assert.throws(
        () => mdastToRuns(tree, highlights),
        /Available: teal, pink, orange/
      );
    });

    it('should handle paragraph + bullets + paragraph', () => {
      const tree = parseMarkdown('Intro.\n\n- Bullet one\n- Bullet two\n\nConclusion.');
      const runs = mdastToRuns(tree, highlights);
      // Intro (1) + bullets (2) + conclusion (1) = 4
      assert.strictEqual(runs.length, 4);
      assert.strictEqual(runs[0].text, 'Intro.');
      assert.strictEqual(runs[1].text, 'Bullet one');
      assert.strictEqual(runs[1].bullet, true);
      assert.strictEqual(runs[2].text, 'Bullet two');
      assert.strictEqual(runs[2].bullet, true);
      assert.strictEqual(runs[3].text, 'Conclusion.');
      assert.strictEqual(runs[3].breakLine, true);
    });

    it('should handle bold inside bullet', () => {
      const tree = parseMarkdown('- **Bold** bullet');
      const runs = mdastToRuns(tree, highlights);
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'Bold');
      assert.strictEqual(runs[0].bold, true);
      assert.strictEqual(runs[0].bullet, true);
      assert.strictEqual(runs[1].text, ' bullet');
      assert.strictEqual(runs[1].bullet, undefined);
      assert.strictEqual(runs[1].bold, undefined);
    });
  });

  describe('text() DSL function', () => {
    it('should create a component node with correct type', () => {
      const node = text('Hello **world**');
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, TEXT_COMPONENT);
      assert.strictEqual(node.props.content, 'Hello **world**');
    });

    it('should pass props correctly', () => {
      const node = text('Content', { style: 'body' as any, color: 'FF0000' });
      assert.strictEqual(node.props.content, 'Content');
      assert.strictEqual(node.props.style, 'body');
      assert.strictEqual(node.props.color, 'FF0000');
    });
  });

  describe('component expansion', () => {
    const theme = themeWithHighlights();

    it('should auto-register on import', () => {
      assert.ok(componentRegistry.has('text'));
    });

    it('should expand to a TextNode', async () => {
      const node = text('Hello **world**');
      const expanded = await componentRegistry.expand(node, { theme });
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });

    it('should expand bold markdown to bold runs', async () => {
      const node = text('Normal **bold** text');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 3);
      assert.strictEqual(runs[0].text, 'Normal ');
      assert.strictEqual(runs[1].text, 'bold');
      assert.strictEqual(runs[1].bold, true);
      assert.strictEqual(runs[2].text, ' text');
    });

    it('should expand highlight directives using theme', async () => {
      const node = text(':teal[highlighted]');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.deepStrictEqual(runs[0].highlight, highlights.teal);
    });

    it('should apply style and color props', async () => {
      const node = text('text', { style: 'body' as any, color: 'AABBCC' });
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.style, 'body');
      assert.strictEqual(expanded.color, 'AABBCC');
    });

    it('should default hAlign to LEFT and vAlign to TOP', async () => {
      const node = text('text');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.hAlign, 'left');
      assert.strictEqual(expanded.vAlign, 'top');
    });

    it('should apply bulletColor to bullet runs', async () => {
      const node = text('- First\n- Second', { bulletColor: 'FF0000' });
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.deepStrictEqual(runs[0].bullet, { color: 'FF0000' });
      assert.deepStrictEqual(runs[1].bullet, { color: 'FF0000' });
    });

    it('should expand full markdown document', async () => {
      const node = text(`
Intro with **bold** and :teal[highlight].

- First bullet
- Second bullet with :pink[color]

Conclusion.
      `);
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];

      // Verify structure: intro runs + bullet runs + conclusion
      assert.ok(runs.length >= 5, `Expected at least 5 runs, got ${runs.length}`);

      // Check highlight resolved
      const highlightRun = runs.find(r => r.highlight);
      assert.ok(highlightRun, 'Should have a highlighted run');
      assert.deepStrictEqual(highlightRun!.highlight, highlights.teal);

      // Check bullets present
      const bulletRuns = runs.filter(r => r.bullet);
      assert.ok(bulletRuns.length >= 2, `Expected at least 2 bullet runs, got ${bulletRuns.length}`);
    });
  });

  describe('plainText() DSL function', () => {
    it('should create a component node with plainText type', () => {
      const node = plainText('ARCHITECTURE');
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, PLAIN_TEXT_COMPONENT);
      assert.strictEqual(node.props.content, 'ARCHITECTURE');
    });

    it('should pass props correctly', () => {
      const node = plainText('Label', { style: 'eyebrow' as any, color: 'FF0000' });
      assert.strictEqual(node.props.content, 'Label');
      assert.strictEqual(node.props.style, 'eyebrow');
      assert.strictEqual(node.props.color, 'FF0000');
    });
  });

  describe('plainText expansion', () => {
    const theme = themeWithHighlights();

    it('should auto-register on import', () => {
      assert.ok(componentRegistry.has('plainText'));
    });

    it('should expand to a TextNode with single run', async () => {
      const node = plainText('Hello world');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'Hello world');
    });

    it('should NOT parse markdown — bold stays literal', async () => {
      const node = plainText('**not bold**');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, '**not bold**');
      assert.strictEqual(runs[0].bold, undefined);
    });

    it('should NOT parse directives — stays literal', async () => {
      const node = plainText(':teal[not highlighted]');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, ':teal[not highlighted]');
      assert.strictEqual(runs[0].highlight, undefined);
    });

    it('should apply style, color, and alignment', async () => {
      const node = plainText('Label', { style: 'body' as any, color: 'AABBCC', hAlign: 'center' as any, vAlign: 'middle' as any });
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.style, 'body');
      assert.strictEqual(expanded.color, 'AABBCC');
      assert.strictEqual(expanded.hAlign, 'center');
      assert.strictEqual(expanded.vAlign, 'middle');
    });

    it('should default hAlign to LEFT and vAlign to TOP', async () => {
      const node = plainText('Label');
      const expanded = await componentRegistry.expand(node, { theme }) as any;
      assert.strictEqual(expanded.hAlign, 'left');
      assert.strictEqual(expanded.vAlign, 'top');
    });
  });
});
