// Slot Compiler Tests
// Tests for compileSlot: slot markdown string → ComponentNode[]
//
// compileSlot is the slot compiler:
// - :::directives → dispatched through registry
// - Bare MDAST → auto-wrapped in default component (Component.Document)

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileSlot } from '../src/core/markdown/slotCompiler.js';
import { Component, HALIGN, VALIGN } from '../src/core/model/types.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
// Side-effect imports: trigger component registration
import '../src/components/text.js';
import '../src/components/primitives.js';
import '../src/components/table.js';
import '../src/components/mermaid.js';
import '../src/components/card.js';
import '../src/components/quote.js';
import '../src/components/document.js';
import '../src/components/containers.js';

/** Helper: get props as any to avoid unknown type errors in tests */
function props(nodes: any[], index: number): any {
  return nodes[index].props;
}

describe('Slot Compiler', () => {
  describe('bare MDAST auto-wrapping', () => {
    it('should wrap a single paragraph in the default component', () => {
      const nodes = compileSlot('Hello world');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Document);
      assert.strictEqual(props(nodes, 0).body, 'Hello world');
    });

    it('should group multiple paragraphs into one default component', () => {
      const nodes = compileSlot('First paragraph.\n\nSecond paragraph.');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Document);
      const body = props(nodes, 0).body as string;
      assert.ok(body.includes('First paragraph.'));
      assert.ok(body.includes('Second paragraph.'));
    });

    it('should group heading + paragraph + list into one default component', () => {
      const md = '## Overview\n\nIntro paragraph.\n\n- Point one\n- Point two';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Document);
      const body = props(nodes, 0).body as string;
      assert.ok(body.includes('## Overview'));
      assert.ok(body.includes('Intro paragraph.'));
      assert.ok(body.includes('- Point one'));
    });

    it('should group a single heading into the default component', () => {
      const nodes = compileSlot('## Subheading');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Document);
    });

    it('should group a table into the default component', () => {
      const md = '| A | B |\n|---|---|\n| C | D |';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Document);
    });

    it('should group a list into the default component', () => {
      const nodes = compileSlot('- First\n- Second\n- Third');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Document);
    });
  });

  describe('bare MDAST + directive interleaving', () => {
    it('should split bare MDAST around a directive', () => {
      const md = 'Before image.\n\n:::image\npic.png\n:::\n\nAfter image.';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual(nodes[0].componentName, Component.Document);
      assert.strictEqual(nodes[1].componentName, Component.Image);
      assert.strictEqual(nodes[2].componentName, Component.Document);
    });

    it('should handle directive at start with trailing bare MDAST', () => {
      const md = ':::image\npic.png\n:::\n\nAfter image.';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, Component.Image);
      assert.strictEqual(nodes[1].componentName, Component.Document);
    });

    it('should handle bare MDAST followed by directive', () => {
      const md = 'Some text.\n\n:::card\ntitle: Hello\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, Component.Document);
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
      assert.strictEqual(nodes[0].componentName, Component.Document);
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
      const nodes = compileSlot(':::image\nasset.illustrations.integrate\n:::');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Image);
      assert.strictEqual(props(nodes, 0).body, 'asset.illustrations.integrate');
    });
  });

  describe(':::table directive', () => {
    it('should deserialize :::table{variant="clean"} with GFM table body', () => {
      const md = ':::table{variant="clean"}\n| A | B |\n|---|---|\n| C | D |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Table);
      assert.strictEqual(props(nodes, 0).variant, 'clean');
      // Body contains the raw GFM table text (parsed in expand, not deserialize)
      assert.ok(props(nodes, 0).body.includes('| A | B |'));
    });

    it('should deserialize :::table without attributes as plain table', () => {
      const md = ':::table\n| X | Y |\n|---|---|\n| 1 | 2 |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Table);
      assert.strictEqual(props(nodes, 0).variant, undefined);
      assert.ok(props(nodes, 0).body.includes('| X | Y |'));
    });

    it('should pass headerColumns from attributes', () => {
      const md = ':::table{variant="clean" headerColumns="1"}\n| A | B |\n|---|---|\n| C | D |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(props(nodes, 0).headerColumns, 1);
    });
  });

  describe(':::quote directive', () => {
    it('should compile :::quote directive with attributes and body text', () => {
      const md = ':::quote{attribution="— Jane Smith"}\nThis changed everything.\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Quote);
      assert.strictEqual(props(nodes, 0).body, 'This changed everything.');
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
    it('should compile :::shape directive with attributes', () => {
      const md = ':::shape{shape="rect"}\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Shape);
      assert.strictEqual(props(nodes, 0).shape, 'rect');
    });
  });

  describe(':::text directive', () => {
    it('should compile :::text directive to a text node', () => {
      const md = ':::text\n**Bold** and *italic*\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Text);
      assert.ok(props(nodes, 0).body.includes('**Bold**'));
    });

    it('should compile :::text with list content', () => {
      const md = ':::text\n- First\n- Second\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Text);
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
    it('should compile :::card directive with attributes and body text', () => {
      const md = ':::card{title="Hello"}\nWorld\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Card);
      assert.strictEqual(props(nodes, 0).title, 'Hello');
      assert.strictEqual(props(nodes, 0).body, 'World');
    });

    it('should compile :::card with attributes only (no body)', () => {
      const md = ':::card{title="Hello" variant="flat"}\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Card);
      assert.strictEqual(props(nodes, 0).title, 'Hello');
      assert.strictEqual(props(nodes, 0).variant, 'flat');
    });
  });

  describe(':::document directive', () => {
    it('should compile :::document with a single paragraph', () => {
      const md = ':::document\nHello world\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Document);
      assert.strictEqual(props(nodes, 0).body, 'Hello world');
    });

    it('should compile :::document with heading and paragraph', () => {
      const md = ':::document\n## Title\n\nSome text here\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Document);
    });

    it('should compile multiple directives in sequence', () => {
      const md = ':::document\nBefore\n:::\n\n:::document\nAfter\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual(nodes[0].componentName, Component.Document);
      assert.strictEqual(nodes[1].componentName, Component.Document);
    });

    it('should compile :::document alongside other directives', () => {
      const md = ':::document\nSome text\n:::\n\n:::image\npic.png\n:::\n\n:::document\nMore text\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual(nodes[0].componentName, Component.Document);
      assert.strictEqual(nodes[1].componentName, Component.Image);
      assert.strictEqual(nodes[2].componentName, Component.Document);
    });
  });

  describe(':::row directive (slotted)', () => {
    it('should compile :::row with card children', () => {
      const md = '::::row\n:::card{title="A"}\nBody A\n:::\n\n:::card{title="B"}\nBody B\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Row);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0].componentName, Component.Card);
      assert.strictEqual(children[1].componentName, Component.Card);
    });

    it('should pass coerced attributes to row', () => {
      const md = '::::row{gap="tight"}\n:::card{title="X"}\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes[0].componentName, Component.Row);
      assert.strictEqual(props(nodes, 0).gap, 'tight');
    });

    it('should handle bare text inside row (auto-wrapped in document)', () => {
      const md = '::::row\nSome bare text\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes[0].componentName, Component.Row);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0].componentName, Component.Document);
    });
  });

  describe(':::column directive (slotted)', () => {
    it('should compile :::column with mixed children', () => {
      const md = '::::column\nSome text\n\n:::image\npic.png\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Column);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0].componentName, Component.Document);
      assert.strictEqual(children[1].componentName, Component.Image);
    });

    it('should pass coerced attributes to column', () => {
      const md = '::::column{gap="tight" padding="0.5"}\nHello\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(props(nodes, 0).gap, 'tight');
      assert.strictEqual(props(nodes, 0).padding, 0.5);
    });
  });

  describe(':::grid directive (slotted)', () => {
    it('should compile :::grid with card children', () => {
      const md = '::::grid{columns="3"}\n:::card{title="A"}\n:::\n\n:::card{title="B"}\n:::\n\n:::card{title="C"}\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Grid);
      assert.strictEqual(props(nodes, 0).columns, 3);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 3);
    });
  });

  describe(':::stack directive (slotted)', () => {
    it('should compile :::stack with children', () => {
      const md = '::::stack\n:::image\nbg.png\n:::\n\nOverlay text\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Stack);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0].componentName, Component.Image);
      assert.strictEqual(children[1].componentName, Component.Document);
    });
  });

  describe('nested container directives', () => {
    it('should handle ::::row containing :::column children', () => {
      const md = '::::row\n:::column\nLeft content\n:::\n\n:::column\nRight content\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Row);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0].componentName, Component.Column);
      assert.strictEqual(children[1].componentName, Component.Column);
    });

    it('should handle 3-level nesting: row > column > card', () => {
      const md = '::::::row\n::::column\n:::card{title="Nested"}\nDeep body\n:::\n::::\n::::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Row);
      const columns = props(nodes, 0).children;
      assert.strictEqual(columns.length, 1);
      assert.strictEqual(columns[0].componentName, Component.Column);
      const cards = columns[0].props.children;
      assert.strictEqual(cards.length, 1);
      assert.strictEqual(cards[0].componentName, Component.Card);
      assert.strictEqual(cards[0].props.title, 'Nested');
      assert.strictEqual(cards[0].props.body, 'Deep body');
    });
  });

  describe('multi-line body in nested scalar directive', () => {
    it('should extract multi-line card body inside a row', () => {
      const md = '::::row\n:::card{title="Rich"}\nFirst paragraph.\n\nSecond paragraph with **bold**.\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].componentName, Component.Row);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0].componentName, Component.Card);
      const body = children[0].props.body as string;
      assert.ok(body.includes('First paragraph.'), 'should contain first paragraph');
      assert.ok(body.includes('Second paragraph with **bold**'), 'should contain second paragraph');
    });
  });

  describe('error cases', () => {
    it('should throw on unknown directive', () => {
      const md = ':::unknown\nsome body\n:::';
      assert.throws(() => compileSlot(md), /unknown directive ":::unknown"/);
    });

    it('should throw on multi-slot component used as directive', async () => {
      // Register a test component with multiple slots
      const { componentRegistry } = await import('../src/core/rendering/registry.js');
      componentRegistry.define({
        name: 'test-multi-slot',
        slots: ['left', 'right'],
        expand: (props: any) => ({ type: NODE_TYPE.TEXT, content: [], hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP } as any),
      });
      const md = ':::test-multi-slot\nsome body\n:::';
      assert.throws(() => compileSlot(md), /only supports 1/);
    });
  });
});
