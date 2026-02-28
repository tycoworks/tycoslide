// Text Component Tests
// Tests for markdown expansion, text expansion, and DSL functions

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { text } from '../src/text.js';
import { CONTENT, HALIGN, VALIGN, NODE_TYPE, TEXT_STYLE, componentRegistry } from 'tycoslide';
import { Component } from '../src/names.js';
import type { NormalizedRun } from 'tycoslide';
import { mockTheme, noopCanvas } from './mocks.js';

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

/** Helper: expand text with PROSE content and return runs */
async function expandProseRuns(content: string, theme?: any): Promise<NormalizedRun[]> {
  const node = text(content, { content: CONTENT.PROSE });
  const expanded = await componentRegistry.expand(node, { theme: theme ?? themeWithAccents(), canvas: noopCanvas() }) as any;
  return expanded.content as NormalizedRun[];
}

describe('Text', () => {
  describe('text() with CONTENT.PROSE', () => {
    it('should create a component node with correct type and content kind', () => {
      const node = text('Hello **world**', { content: CONTENT.PROSE });
      assert.strictEqual(node.type, NODE_TYPE.COMPONENT);
      assert.strictEqual(node.componentName, Component.Text);
      assert.strictEqual(node.props.body, 'Hello **world**');
      assert.strictEqual(node.props.content, CONTENT.PROSE);
    });

    it('should pass props correctly', () => {
      const node = text('Content', { content: CONTENT.PROSE, style: TEXT_STYLE.BODY as any, color: 'FF0000' });
      assert.strictEqual(node.props.body, 'Content');
      assert.strictEqual(node.props.style, 'body');
      assert.strictEqual(node.props.color, 'FF0000');
    });
  });

  describe('CONTENT.PROSE expansion', () => {
    const theme = themeWithAccents();

    it('should auto-register on import', () => {
      assert.ok(componentRegistry.has(Component.Text));
    });

    it('should expand to a TextNode', async () => {
      const node = text('Hello **world**', { content: CONTENT.PROSE });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() });
      assert.strictEqual(expanded.type, NODE_TYPE.TEXT);
    });

    it('should expand plain text to a single run', async () => {
      const runs = await expandProseRuns('Hello world');
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'Hello world');
    });

    it('should expand bold markdown to bold runs', async () => {
      const runs = await expandProseRuns('Normal **bold** text');
      assert.strictEqual(runs.length, 3);
      assert.strictEqual(runs[0].text, 'Normal ');
      assert.strictEqual(runs[1].text, 'bold');
      assert.strictEqual(runs[1].bold, true);
      assert.strictEqual(runs[2].text, ' text');
    });

    it('should expand italic text', async () => {
      const runs = await expandProseRuns('*italic text*');
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'italic text');
      assert.strictEqual(runs[0].italic, true);
    });

    it('should expand mixed inline formatting', async () => {
      const runs = await expandProseRuns('Normal **bold** and *italic*');
      assert.strictEqual(runs.length, 4);
      assert.strictEqual(runs[0].text, 'Normal ');
      assert.strictEqual(runs[1].text, 'bold');
      assert.strictEqual(runs[1].bold, true);
      assert.strictEqual(runs[2].text, ' and ');
      assert.strictEqual(runs[3].text, 'italic');
      assert.strictEqual(runs[3].italic, true);
    });

    it('should expand bold+italic', async () => {
      const runs = await expandProseRuns('***bold italic***');
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].bold, true);
      assert.strictEqual(runs[0].italic, true);
    });

    it('should expand unordered list to bullet runs', async () => {
      const runs = await expandProseRuns('- First\n- Second\n- Third');
      assert.strictEqual(runs.length, 3);
      assert.strictEqual(runs[0].text, 'First');
      assert.deepStrictEqual(runs[0].bullet, { color: '000000' }); // bulletColor from token
      assert.strictEqual(runs[1].text, 'Second');
      assert.deepStrictEqual(runs[1].bullet, { color: '000000' });
      assert.strictEqual(runs[2].text, 'Third');
      assert.deepStrictEqual(runs[2].bullet, { color: '000000' });
    });

    it('should expand ordered list to numbered bullet runs', async () => {
      const runs = await expandProseRuns('1. First\n2. Second');
      assert.strictEqual(runs.length, 2);
      assert.deepStrictEqual(runs[0].bullet, { type: 'number', color: '000000' });
      assert.deepStrictEqual(runs[1].bullet, { type: 'number', color: '000000' });
    });

    it('should add breakLine between paragraphs', async () => {
      const runs = await expandProseRuns('First paragraph.\n\nSecond paragraph.');
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'First paragraph.');
      assert.strictEqual(runs[0].breakLine, undefined);
      assert.strictEqual(runs[1].text, 'Second paragraph.');
      assert.strictEqual(runs[1].breakLine, true);
    });

    it('should expand accent directives using theme colors', async () => {
      const runs = await expandProseRuns(':teal[accent text]');
      assert.strictEqual(runs.length, 1);
      assert.strictEqual(runs[0].text, 'accent text');
      assert.strictEqual(runs[0].color, expectedAccentColors.teal);
      assert.strictEqual(runs[0].highlight, undefined);
    });

    it('should handle bold inside accent directive', async () => {
      const runs = await expandProseRuns(':teal[**bold** accent]');
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'bold');
      assert.strictEqual(runs[0].bold, true);
      assert.strictEqual(runs[0].color, expectedAccentColors.teal);
      assert.strictEqual(runs[1].text, ' accent');
      assert.strictEqual(runs[1].color, expectedAccentColors.teal);
    });

    it('should throw on unknown accent name', async () => {
      await assert.rejects(
        () => expandProseRuns(':unknown[text]'),
        /Unknown accent 'unknown'/
      );
    });

    it('should include available accents in error message', async () => {
      await assert.rejects(
        () => expandProseRuns(':organge[text]'),
        /Available: teal, pink, orange/
      );
    });

    it('should handle paragraph + bullets + paragraph', async () => {
      const runs = await expandProseRuns('Intro.\n\n- Bullet one\n- Bullet two\n\nConclusion.');
      assert.strictEqual(runs.length, 4);
      assert.strictEqual(runs[0].text, 'Intro.');
      assert.strictEqual(runs[1].text, 'Bullet one');
      assert.deepStrictEqual(runs[1].bullet, { color: '000000' }); // bulletColor from token
      assert.strictEqual(runs[2].text, 'Bullet two');
      assert.deepStrictEqual(runs[2].bullet, { color: '000000' });
      assert.strictEqual(runs[3].text, 'Conclusion.');
      assert.strictEqual(runs[3].breakLine, true);
    });

    it('should handle bold inside bullet', async () => {
      const runs = await expandProseRuns('- **Bold** bullet');
      assert.strictEqual(runs.length, 2);
      assert.strictEqual(runs[0].text, 'Bold');
      assert.strictEqual(runs[0].bold, true);
      assert.deepStrictEqual(runs[0].bullet, { color: '000000' }); // bulletColor from token
      assert.strictEqual(runs[1].text, ' bullet');
      assert.strictEqual(runs[1].bullet, undefined);
      assert.strictEqual(runs[1].bold, undefined);
    });

    it('should apply style and color props', async () => {
      const node = text('text', { content: CONTENT.PROSE, style: TEXT_STYLE.BODY as any, color: 'AABBCC' });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() }) as any;
      assert.strictEqual(expanded.style, 'body');
      assert.strictEqual(expanded.color, 'AABBCC');
    });

    it('should default hAlign to LEFT and vAlign to TOP', async () => {
      const node = text('text', { content: CONTENT.PROSE });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() }) as any;
      assert.strictEqual(expanded.hAlign, HALIGN.LEFT);
      assert.strictEqual(expanded.vAlign, VALIGN.TOP);
    });

    it('should apply bulletColor to bullet runs', async () => {
      const node = text('- First\n- Second', { content: CONTENT.PROSE, bulletColor: 'FF0000' });
      const expanded = await componentRegistry.expand(node, { theme, canvas: noopCanvas() }) as any;
      const runs = expanded.content as NormalizedRun[];
      assert.deepStrictEqual(runs[0].bullet, { color: 'FF0000' });
      assert.deepStrictEqual(runs[1].bullet, { color: 'FF0000' });
    });

    it('should expand full prose document', async () => {
      const runs = await expandProseRuns(`
Intro with **bold** and :teal[highlight].

- First bullet
- Second bullet with :pink[color]

Conclusion.
      `);

      assert.ok(runs.length >= 5, `Expected at least 5 runs, got ${runs.length}`);

      const accentRun = runs.find((r: NormalizedRun) => r.color === expectedAccentColors.teal);
      assert.ok(accentRun, 'Should have an accent-colored run');

      const bulletRuns = runs.filter((r: NormalizedRun) => r.bullet);
      assert.ok(bulletRuns.length >= 2, `Expected at least 2 bullet runs, got ${bulletRuns.length}`);
    });
  });

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

    it('should auto-register on import', () => {
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
          assert.ok(err.message.includes('CONTENT.PROSE'));
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
  });
});
