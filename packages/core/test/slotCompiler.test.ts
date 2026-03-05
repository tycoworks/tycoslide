// Slot Compiler Tests
// Tests for compileSlot: slot markdown string → ComponentNode[]
//
// compileSlot is the slot compiler:
// - :::directives → dispatched through registry
// - Bare MDAST → compiled inline via compileBareMarkdown()

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileSlot } from '../src/core/markdown/slotCompiler.js';
import { HALIGN, TEXT_STYLE, VALIGN } from '../src/core/model/types.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import { SYNTAX } from '../src/core/model/syntax.js';
import { componentRegistry, defineComponent } from '../src/core/rendering/registry.js';
import { C, testComponents } from './test-components.js';

// Register test components before tests run
componentRegistry.register(testComponents);

/** Helper: get props as any to avoid unknown type errors in tests */
function props(nodes: any[], index: number): any {
  return nodes[index].props;
}

describe('Slot Compiler', () => {
  describe('bare MDAST compilation', () => {
    it('should compile a single paragraph to a text node', () => {
      const nodes = compileSlot('Hello world');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual(props(nodes, 0).body, 'Hello world');
    });

    it('should return multiple paragraphs as separate text nodes', () => {
      const nodes = compileSlot('First paragraph.\n\nSecond paragraph.');
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual((nodes[1] as any).componentName, C.Text);
    });

    it('should return heading + paragraph + list as separate nodes', () => {
      const md = '## Overview\n\nIntro paragraph.\n\n- Point one\n- Point two';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual((nodes[0] as any).componentName, C.Text); // heading
      assert.strictEqual((nodes[1] as any).componentName, C.Text); // paragraph
      assert.strictEqual((nodes[2] as any).componentName, C.Text); // list
    });

    it('should compile a single heading to a text node with style', () => {
      const nodes = compileSlot('## Subheading');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.ok(props(nodes, 0).style); // has heading style
    });

    it('should compile a GFM table to a table node', () => {
      const md = '| A | B |\n|---|---|\n| C | D |';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Table);
    });

    it('should compile a list to a text component node', () => {
      const nodes = compileSlot('- First\n- Second\n- Third');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
    });

  });

  describe('bare MDAST + directive interleaving', () => {
    it('should split bare MDAST around a directive', () => {
      const md = 'Before image.\n\n:::image\npic.png\n:::\n\nAfter image.';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 3);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual((nodes[1] as any).componentName, C.Image);
      assert.strictEqual((nodes[2] as any).componentName, C.Text);
    });

    it('should handle directive at start with trailing bare MDAST', () => {
      const md = ':::image\npic.png\n:::\n\nAfter image.';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual((nodes[0] as any).componentName, C.Image);
      assert.strictEqual((nodes[1] as any).componentName, C.Text);
    });

    it('should handle bare MDAST followed by directive', () => {
      const md = 'Some text.\n\n:::card\ntitle: Hello\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual((nodes[1] as any).componentName, C.Card);
    });
  });

  describe('empty input and thematic breaks', () => {
    it('should return empty array for empty input', () => {
      const nodes = compileSlot('');
      assert.strictEqual(nodes.length, 0);
    });

    it('should skip thematic breaks and return surrounding content as separate nodes', () => {
      const md = 'Before\n\n---\n\nAfter';
      const nodes = compileSlot(md);
      // Thematic break is skipped, Before and After are separate text nodes
      assert.strictEqual(nodes.length, 2);
      assert.strictEqual((nodes[0] as any).componentName, C.Text);
      assert.strictEqual((nodes[1] as any).componentName, C.Text);
    });
  });

  describe(':::image directive', () => {
    it('should compile :::image directive to an image() node', () => {
      const nodes = compileSlot(':::image\n/path/to/image.png\n:::');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Image);
      assert.strictEqual(props(nodes, 0).body, '/path/to/image.png');
    });

    it('should compile asset-style image in :::image directive', () => {
      const nodes = compileSlot(':::image\nasset.illustrations.integrate\n:::');
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Image);
      assert.strictEqual(props(nodes, 0).body, 'asset.illustrations.integrate');
    });
  });

  describe(':::table directive', () => {
    it('should deserialize :::table{variant="clean"} with GFM table body', () => {
      const md = ':::table{variant="clean"}\n| A | B |\n|---|---|\n| C | D |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Table);
      assert.strictEqual(props(nodes, 0).variant, 'clean');
      // Body contains the raw GFM table text (parsed in expand, not deserialize)
      assert.ok(props(nodes, 0).body.includes('| A | B |'));
    });

    it('should deserialize :::table without attributes as plain table', () => {
      const md = ':::table\n| X | Y |\n|---|---|\n| 1 | 2 |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Table);
      assert.strictEqual(props(nodes, 0).variant, undefined);
      assert.ok(props(nodes, 0).body.includes('| X | Y |'));
    });

    it('should pass headerColumns from attributes', () => {
      const md = ':::table{variant="clean" headerColumns="1"}\n| A | B |\n|---|---|\n| C | D |\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(props(nodes, 0).headerColumns, 1);
    });
  });

  describe(':::line directive', () => {
    it('should compile :::line directive with empty body', () => {
      const md = ':::line\n:::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Line);
    });
  });

  describe(':::row directive (slotted)', () => {
    it('should compile :::row with card children', () => {
      const md = '::::row\n:::card{title="A"}\nBody A\n:::\n\n:::card{title="B"}\nBody B\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Row);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0].componentName, C.Card);
      assert.strictEqual(children[1].componentName, C.Card);
    });

    it('should pass coerced attributes to row', () => {
      const md = '::::row{gap="tight"}\n:::card{title="X"}\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual((nodes[0] as any).componentName, C.Row);
      assert.strictEqual(props(nodes, 0).gap, 'tight');
    });

    it('should handle bare text inside row (auto-wrapped as text)', () => {
      const md = '::::row\nSome bare text\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual((nodes[0] as any).componentName, C.Row);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0].componentName, C.Text);
    });
  });

  describe(':::column directive (slotted)', () => {
    it('should compile :::column with mixed children', () => {
      const md = '::::column\nSome text\n\n:::image\npic.png\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Column);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0].componentName, C.Text);
      assert.strictEqual(children[1].componentName, C.Image);
    });

    it('should pass coerced attributes to column', () => {
      const md = '::::column{gap="tight" padding="0.5"}\nHello\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(props(nodes, 0).gap, 'tight');
      assert.strictEqual(props(nodes, 0).padding, 0.5);
    });
  });

  describe('nested container directives', () => {
    it('should handle ::::row containing :::column children', () => {
      const md = '::::row\n:::column\nLeft content\n:::\n\n:::column\nRight content\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Row);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0].componentName, C.Column);
      assert.strictEqual(children[1].componentName, C.Column);
    });

    it('should handle 3-level nesting: row > column > card', () => {
      const md = '::::::row\n::::column\n:::card{title="Nested"}\nDeep body\n:::\n::::\n::::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Row);
      const columns = props(nodes, 0).children;
      assert.strictEqual(columns.length, 1);
      assert.strictEqual(columns[0].componentName, C.Column);
      const cards = columns[0].props.children;
      assert.strictEqual(cards.length, 1);
      assert.strictEqual(cards[0].componentName, C.Card);
      assert.strictEqual(cards[0].props.title, 'Nested');
      assert.strictEqual(cards[0].props.body, 'Deep body');
    });
  });

  describe('multi-line body in nested scalar directive', () => {
    it('should extract multi-line card body inside a row', () => {
      const md = '::::row\n:::card{title="Rich"}\nFirst paragraph.\n\nSecond paragraph with **bold**.\n:::\n::::';
      const nodes = compileSlot(md);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as any).componentName, C.Row);
      const children = props(nodes, 0).children;
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0].componentName, C.Card);
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

    it('should throw on duplicate MDAST handler registration', () => {
      const dup = defineComponent({
        name: 'duplicate-paragraph-handler',
        tokens: [],
        mdast: {
          nodeTypes: [SYNTAX.PARAGRAPH],
          compile: () => null,
        },
        expand: () => ({}) as any,
      });
      assert.throws(
        () => componentRegistry.register(dup),
        /MDAST node type 'paragraph' already handled by/,
      );
    });

    it('should throw on multi-slot component used as directive', () => {
      // Register a test component with multiple slots
      const multiSlot = defineComponent({
        name: 'test-multi-slot',
        slots: ['left', 'right'],
        tokens: [],
        expand: (props: any) => ({ type: NODE_TYPE.TEXT, content: [], style: TEXT_STYLE.BODY, color: '000000', hAlign: HALIGN.LEFT, vAlign: VALIGN.TOP, lineHeightMultiplier: 1.2 } as any),
      });
      componentRegistry.register(multiSlot);
      const md = ':::test-multi-slot\nsome body\n:::';
      assert.throws(() => compileSlot(md), /only supports 1/);
    });
  });
});
