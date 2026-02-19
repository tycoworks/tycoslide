// Slot Compiler Tests
// Tests for compileSlot: slot markdown string → ComponentNode[]
//
// compileSlot is the slot compiler:
// - :::directives → dispatched through registry
// - Bare MDAST → auto-wrapped in default component ('block')

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileSlot } from '../src/markdown/slotCompiler.js';
import { Component } from '../src/core/types.js';
// Side-effect imports: trigger component registration
import '../src/dsl/text.js';
import '../src/dsl/primitives.js';
import '../src/dsl/table.js';
import '../src/dsl/mermaid.js';
import '../src/dsl/card.js';
import '../src/dsl/quote.js';
import '../src/dsl/block.js';

/** Helper: get props as any to avoid unknown type errors in tests */
function props(nodes: any[], index: number): any {
  return nodes[index].props;
}

describe('Slot Compiler', () => {
  describe('bare MDAST auto-wrapping', () => {
    it('should wrap a single paragraph in the default component', () => {
      const nodes = compileSlot('Hello world');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
      assert.strictEqual(props(nodes, 0).body, 'Hello world');
    });

    it('should group multiple paragraphs into one default component', () => {
      const nodes = compileSlot('First paragraph.\n\nSecond paragraph.');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
      const body = props(nodes, 0).body as string;
      assert.ok(body.includes('First paragraph.'));
      assert.ok(body.includes('Second paragraph.'));
    });

    it('should group heading + paragraph + list into one default component', () => {
      const md = '## Overview\n\nIntro paragraph.\n\n- Point one\n- Point two';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
      const body = props(nodes, 0).body as string;
      assert.ok(body.includes('## Overview'));
      assert.ok(body.includes('Intro paragraph.'));
      assert.ok(body.includes('- Point one'));
    });

    it('should group a single heading into the default component', () => {
      const nodes = compileSlot('## Subheading');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
    });

    it('should group a table into the default component', () => {
      const md = '| A | B |\n|---|---|\n| C | D |';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
    });

    it('should group a list into the default component', () => {
      const nodes = compileSlot('- First\n- Second\n- Third');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
    });
  });

  describe('bare MDAST + directive interleaving', () => {
    it('should split bare MDAST around a directive', () => {
      const md = 'Before image.\n\n:::image\npic.png\n:::\n\nAfter image.';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual(nodes[0].componentName, Component.Block);
      assert.strictEqual(nodes[1].componentName, Component.Image);
      assert.strictEqual(nodes[2].componentName, Component.Block);
    });

    it('should handle directive at start with trailing bare MDAST', () => {
      const md = ':::image\npic.png\n:::\n\nAfter image.';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, Component.Image);
      assert.strictEqual(nodes[1].componentName, Component.Block);
    });

    it('should handle bare MDAST followed by directive', () => {
      const md = 'Some text.\n\n:::card\ntitle: Hello\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, Component.Block);
      assert.strictEqual(nodes[1].componentName, Component.Card);
    });
  });

  describe('empty input and thematic breaks', () => {
    it('should return empty array for empty input', () => {
      const nodes = compileSlot('');
      assert.strictEqual(nodes.length, 0);
    });

    it('should skip thematic breaks and group surrounding content', () => {
      const md = 'Before\n\n---\n\nAfter';
      const nodes = compileSlot(md);
      // Thematic break is skipped, but Before and After are still consecutive bare MDAST
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
    });
  });

  describe(':::image directive', () => {
    it('should compile :::image directive to an image() node', () => {
      const nodes = compileSlot(':::image\n/path/to/image.png\n:::');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Image);
      assert.strictEqual(props(nodes, 0).body, '/path/to/image.png');
    });

    it('should compile asset-style image in :::image directive', () => {
      const nodes = compileSlot(':::image\nasset:illustrations.integrate\n:::');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Image);
      assert.strictEqual(props(nodes, 0).body, 'asset:illustrations.integrate');
    });
  });

  describe(':::table directive', () => {
    it('should compile :::table{variant="clean"} with GFM table body', () => {
      const md = ':::table{variant="clean"}\n| A | B |\n|---|---|\n| C | D |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Table);
      assert.strictEqual(props(nodes, 0).variant, 'clean');
      assert.strictEqual(props(nodes, 0).data.length, 2);
      assert.strictEqual(props(nodes, 0).data[0][0], 'A');
      assert.strictEqual(props(nodes, 0).data[1][1], 'D');
      assert.strictEqual(props(nodes, 0).tableProps?.headerRows, 1);
    });

    it('should compile :::table without attributes as plain table', () => {
      const md = ':::table\n| X | Y |\n|---|---|\n| 1 | 2 |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Table);
      assert.strictEqual(props(nodes, 0).variant, undefined);
    });

    it('should throw when :::table contains no GFM table', () => {
      const md = ':::table{variant="clean"}\nJust a paragraph.\n:::';
      assert.throws(() => compileSlot(md), /must contain a GFM table/);
    });

    it('should throw when :::table contains table plus extra content', () => {
      const md = ':::table{variant="clean"}\nExtra paragraph.\n\n| A | B |\n|---|---|\n| C | D |\n:::';
      assert.throws(() => compileSlot(md), /unexpected content/);
    });
  });

  describe(':::quote directive', () => {
    it('should compile :::quote directive with YAML body', () => {
      const md = ':::quote\nquote: "This changed everything."\nattribution: "— Jane Smith"\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Quote);
      assert.strictEqual(props(nodes, 0).quote, 'This changed everything.');
      assert.strictEqual(props(nodes, 0).attribution, '— Jane Smith');
    });
  });

  describe(':::line directive', () => {
    it('should compile :::line directive with empty body', () => {
      const md = ':::line\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Line);
    });
  });

  describe(':::shape directive', () => {
    it('should compile :::shape directive with YAML body', () => {
      const md = ':::shape\nshape: rect\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Shape);
      assert.strictEqual(props(nodes, 0).shape, 'rect');
    });
  });

  describe(':::markdown directive', () => {
    it('should compile :::markdown directive to a markdown node', () => {
      const md = ':::markdown\n**Bold** and *italic*\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Markdown);
      assert.ok(props(nodes, 0).body.includes('**Bold**'));
    });

    it('should compile :::markdown with list content', () => {
      const md = ':::markdown\n- First\n- Second\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Markdown);
      assert.ok(props(nodes, 0).body.includes('- First'));
    });
  });

  describe(':::mermaid directive', () => {
    it('should compile :::mermaid directive', () => {
      const md = ':::mermaid\nflowchart LR\n    A --> B\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Mermaid);
      assert.strictEqual(props(nodes, 0).body, 'flowchart LR\n    A --> B');
    });
  });

  describe(':::card directive', () => {
    it('should compile :::card directive with YAML body', () => {
      const md = ':::card\ntitle: Hello\ndescription: World\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Card);
      assert.strictEqual(props(nodes, 0).title, 'Hello');
      assert.strictEqual(props(nodes, 0).description, 'World');
    });
  });

  describe(':::block directive', () => {
    it('should compile :::block with a single paragraph', () => {
      const md = ':::block\nHello world\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
      assert.strictEqual(props(nodes, 0).body, 'Hello world');
    });

    it('should compile :::block with heading and paragraph', () => {
      const md = ':::block\n## Title\n\nSome text here\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Block);
    });

    it('should compile multiple directives in sequence', () => {
      const md = ':::block\nBefore\n:::\n\n:::block\nAfter\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, Component.Block);
      assert.strictEqual(nodes[1].componentName, Component.Block);
    });

    it('should compile :::block alongside other directives', () => {
      const md = ':::block\nSome text\n:::\n\n:::image\npic.png\n:::\n\n:::block\nMore text\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual(nodes[0].componentName, Component.Block);
      assert.strictEqual(nodes[1].componentName, Component.Image);
      assert.strictEqual(nodes[2].componentName, Component.Block);
    });
  });

  describe('error cases', () => {
    it('should throw on unknown directive', () => {
      const md = ':::unknown\nsome body\n:::';
      assert.throws(() => compileSlot(md), /unknown directive ":::unknown"/);
    });
  });
});
