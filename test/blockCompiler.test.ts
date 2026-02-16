// Block Compiler Tests
// Tests for compileBlocks: markdown string → ComponentNode[]

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileBlocks } from '../src/markdown/blockCompiler.js';
import { MARKDOWN_COMPONENT } from '../src/dsl/text.js';
import { NODE_TYPE } from '../src/core/nodes.js';
import { TEXT_STYLE } from '../src/core/types.js';
// Side-effect imports: trigger component self-registration
import '../src/dsl/table.js';
import '../src/dsl/diagram.js';
import '../src/dsl/card.js';
import '../src/dsl/quote.js';

/** Helper: get props as any to avoid unknown type errors in tests */
function props(nodes: any[], index: number): any {
  return nodes[index].props;
}

describe('Block Compiler', () => {
  describe('paragraphs', () => {
    it('should compile a single paragraph to a text() node', () => {
      const nodes = compileBlocks('Hello world');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, MARKDOWN_COMPONENT);
      assert.strictEqual(props(nodes, 0).content, 'Hello world');
    });

    it('should compile multiple paragraphs to separate text() nodes', () => {
      const nodes = compileBlocks('First paragraph.\n\nSecond paragraph.');
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, MARKDOWN_COMPONENT);
      assert.strictEqual(nodes[1].componentName, MARKDOWN_COMPONENT);
    });

    it('should preserve inline markdown in paragraphs', () => {
      const nodes = compileBlocks('Text with **bold** and *italic*');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(props(nodes, 0).content, 'Text with **bold** and *italic*');
    });

    it('should preserve highlight directives in paragraphs', () => {
      const nodes = compileBlocks('Text with :teal[highlighted]');
      assert.strictEqual(nodes.length, 1);
      assert.ok(props(nodes, 0).content.includes(':teal[highlighted]'));
    });
  });

  describe('lists', () => {
    it('should compile an unordered list to a text() node', () => {
      const nodes = compileBlocks('- First\n- Second\n- Third');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, MARKDOWN_COMPONENT);
      assert.ok(props(nodes, 0).content.includes('- First'));
      assert.ok(props(nodes, 0).content.includes('- Third'));
    });

    it('should compile an ordered list to a text() node', () => {
      const nodes = compileBlocks('1. First\n2. Second');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, MARKDOWN_COMPONENT);
      assert.ok(props(nodes, 0).content.includes('1. First'));
    });

    it('should compile paragraph + list as separate nodes', () => {
      const nodes = compileBlocks('Intro text.\n\n- Bullet one\n- Bullet two');
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, MARKDOWN_COMPONENT);
      assert.strictEqual(nodes[1].componentName, MARKDOWN_COMPONENT);
      assert.ok(props(nodes, 0).content.includes('Intro'));
      assert.ok(props(nodes, 1).content.includes('- Bullet'));
    });
  });

  describe('headings', () => {
    it('should compile ## heading to text() with H2 style', () => {
      const nodes = compileBlocks('## Subheading');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, MARKDOWN_COMPONENT);
      assert.strictEqual(props(nodes, 0).content, 'Subheading');
      assert.strictEqual(props(nodes, 0).style, TEXT_STYLE.H2);
    });

    it('should compile ### heading to text() with H3 style', () => {
      const nodes = compileBlocks('### Label');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(props(nodes, 0).content, 'Label');
      assert.strictEqual(props(nodes, 0).style, TEXT_STYLE.H3);
    });

    it('should compile # heading to text() with H1 style', () => {
      const nodes = compileBlocks('# Title');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(props(nodes, 0).content, 'Title');
      assert.strictEqual(props(nodes, 0).style, TEXT_STYLE.H1);
    });

    it('should compile #### heading to text() with H4 style', () => {
      const nodes = compileBlocks('#### Detail');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(props(nodes, 0).content, 'Detail');
      assert.strictEqual(props(nodes, 0).style, TEXT_STYLE.H4);
    });

    it('should preserve inline formatting in headings', () => {
      const nodes = compileBlocks('## **Bold** heading');
      assert.strictEqual(props(nodes, 0).content, '**Bold** heading');
      assert.strictEqual(props(nodes, 0).style, TEXT_STYLE.H2);
    });

    it('should default depth 5+ to H3 style', () => {
      const nodes = compileBlocks('##### Deep heading');
      assert.strictEqual(props(nodes, 0).style, TEXT_STYLE.H3);
    });
  });

  describe('images', () => {
    it('should compile a standalone image to an image() node', () => {
      const nodes = compileBlocks('![alt text](/path/to/image.png)');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, 'image');
      assert.strictEqual(props(nodes, 0).src, '/path/to/image.png');
    });

    it('should compile asset-style image URLs', () => {
      const nodes = compileBlocks('![](asset:illustrations.integrate)');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, 'image');
      assert.strictEqual(props(nodes, 0).src, 'asset:illustrations.integrate');
    });
  });

  describe('tables', () => {
    it('should compile a markdown table to a table() node', () => {
      const md = '| Name | Role |\n|------|------|\n| Alice | Engineer |';
      const nodes = compileBlocks(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, 'table');
    });

    it('should extract cell text content', () => {
      const md = '| A | B |\n|---|---|\n| C | D |';
      const nodes = compileBlocks(md);
      const data = props(nodes, 0).data;
      assert.strictEqual(data.length, 2); // header + 1 data row
      assert.strictEqual(data[0][0], 'A');
      assert.strictEqual(data[0][1], 'B');
      assert.strictEqual(data[1][0], 'C');
      assert.strictEqual(data[1][1], 'D');
    });

    it('should set headerRows to 1', () => {
      const md = '| H1 | H2 |\n|---|---|\n| D1 | D2 |';
      const nodes = compileBlocks(md);
      assert.strictEqual(props(nodes, 0).tableProps?.headerRows, 1);
    });
  });

  describe('mixed content', () => {
    it('should compile heading + paragraph + list as three nodes', () => {
      const md = '## Overview\n\nIntro paragraph.\n\n- Point one\n- Point two';
      const nodes = compileBlocks(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual(props(nodes, 0).style, TEXT_STYLE.H2);
      assert.strictEqual(nodes[1].componentName, MARKDOWN_COMPONENT);
      assert.strictEqual(nodes[2].componentName, MARKDOWN_COMPONENT);
    });

    it('should handle paragraph + image + paragraph', () => {
      const md = 'Before image.\n\n![](pic.png)\n\nAfter image.';
      const nodes = compileBlocks(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual(nodes[0].componentName, MARKDOWN_COMPONENT);
      assert.strictEqual(nodes[1].componentName, 'image');
      assert.strictEqual(nodes[2].componentName, MARKDOWN_COMPONENT);
    });

    it('should return empty array for empty input', () => {
      const nodes = compileBlocks('');
      assert.strictEqual(nodes.length, 0);
    });

    it('should skip thematic breaks', () => {
      const md = 'Before\n\n---\n\nAfter';
      const nodes = compileBlocks(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, MARKDOWN_COMPONENT);
      assert.strictEqual(nodes[1].componentName, MARKDOWN_COMPONENT);
    });

    it('should throw on blockquote', () => {
      const md = '> This is a quote';
      assert.throws(() => compileBlocks(md), /unsupported markdown block type "blockquote"/);
    });

    it('should throw on code block (no longer supported)', () => {
      const md = '```sql\nSELECT 1;\n```';
      assert.throws(() => compileBlocks(md), /unsupported markdown block type "code"/);
    });

    it('should compile :::mermaid directive', () => {
      const md = ':::mermaid\nflowchart LR\n    A --> B\n:::';
      const nodes = compileBlocks(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, 'mermaid');
      // input schema transforms raw string into { definition }
      assert.strictEqual(props(nodes, 0).definition, 'flowchart LR\n    A --> B');
    });

    it('should compile :::card directive with YAML body', () => {
      const md = ':::card\ntitle: Hello\ndescription: World\n:::';
      const nodes = compileBlocks(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, 'card');
      assert.strictEqual(props(nodes, 0).title, 'Hello');
      assert.strictEqual(props(nodes, 0).description, 'World');
    });

    it('should throw on unknown directive', () => {
      const md = ':::unknown\nsome body\n:::';
      assert.throws(() => compileBlocks(md), /unknown directive ":::unknown"/);
    });
  });
});
