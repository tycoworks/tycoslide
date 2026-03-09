// HTML Measurement Tests
// Tests generateLayoutHTML using direct ElementNode construction.
// No component DSL, no registry, no expandTree — pure element node trees.

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { generateLayoutHTML } from '../src/core/layout/layoutHtml.js';
import { Bounds } from '../src/core/model/bounds.js';
import { NODE_TYPE } from '../src/core/model/nodes.js';
import type { ElementNode, TextNode, ContainerNode, StackNode, ImageNode, LineNode, ShapeNode, SlideNumberNode, TableNode, TableCellData } from '../src/core/model/nodes.js';
import type { NormalizedRun } from '../src/core/model/types.js';
import { HALIGN, VALIGN, SIZE, SHAPE, DASH_TYPE, TEXT_STYLE, DIRECTION, BORDER_STYLE } from '../src/core/model/types.js';
import { mockTheme as createMockTheme } from './mocks.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// MOCK THEME (layout-focused: realistic font sizes for HTML measurement)
// ============================================

const testImage = path.join(__dirname, 'fixtures', 'test.png');

const mockTheme = createMockTheme({
  slide: { layout: 'LAYOUT_16x9', width: 10, height: 5.625 } as any,
  textStyles: {
    [TEXT_STYLE.H1]: { fontSize: 36 },
    [TEXT_STYLE.H2]: { fontSize: 28 },
    [TEXT_STYLE.H3]: { fontSize: 24 },
    [TEXT_STYLE.H4]: { fontSize: 20 },
    [TEXT_STYLE.BODY]: { fontSize: 18 },
    [TEXT_STYLE.SMALL]: { fontSize: 14 },
    [TEXT_STYLE.EYEBROW]: { fontSize: 12 },
    [TEXT_STYLE.FOOTER]: { fontSize: 12 },
  },
});

// ============================================
// ELEMENT NODE BUILDERS
// ============================================

const bodyStyle = mockTheme.textStyles[TEXT_STYLE.BODY];

/** Plain text node with sensible defaults matching theme tokens */
function textNode(content: string | NormalizedRun[], opts?: Partial<Omit<TextNode, 'type'>>): TextNode {
  return {
    type: NODE_TYPE.TEXT,
    content: typeof content === 'string' ? [{ text: content }] : content,
    style: TEXT_STYLE.BODY,
    resolvedStyle: bodyStyle,
    color: '#000000',
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.TOP,
    lineHeightMultiplier: 1.2,
    bulletIndentPt: 27,
    linkColor: '#0000FF',
    linkUnderline: true,
    ...opts,
  };
}

/** Row container (flex-direction: row) */
function rowNode(...args: any[]): ContainerNode {
  const first = args[0];
  const isOpts = first && typeof first === 'object' && !('type' in first);
  const opts = isOpts ? first : {};
  const children: ElementNode[] = isOpts ? args.slice(1) : args;
  return {
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.ROW,
    children,
    width: opts.width ?? SIZE.FILL,
    height: opts.height ?? SIZE.HUG,
    vAlign: opts.vAlign ?? VALIGN.TOP,
    hAlign: opts.hAlign ?? HALIGN.LEFT,
    gap: opts.gap ?? 0,
    padding: opts.padding,
  };
}

/** Column container (flex-direction: column) */
function colNode(...args: any[]): ContainerNode {
  const first = args[0];
  const isOpts = first && typeof first === 'object' && !('type' in first);
  const opts = isOpts ? first : {};
  const children: ElementNode[] = isOpts ? args.slice(1) : args;
  return {
    type: NODE_TYPE.CONTAINER,
    direction: DIRECTION.COLUMN,
    children,
    width: opts.width ?? SIZE.FILL,
    height: opts.height ?? SIZE.HUG,
    vAlign: opts.vAlign ?? VALIGN.TOP,
    hAlign: opts.hAlign ?? HALIGN.LEFT,
    gap: opts.gap ?? 0,
    padding: opts.padding,
  };
}

/** Image node */
function imageNode(src: string): ImageNode {
  return { type: NODE_TYPE.IMAGE, src };
}

/** Line node (token values baked in from mockTheme) */
function lineNode(): LineNode {
  return { type: NODE_TYPE.LINE, color: '#666666', width: 1, dashType: DASH_TYPE.SOLID };
}

/** Stack node (z-order composition) */
function stackNode(...args: any[]): StackNode {
  const first = args[0];
  const isOpts = first && typeof first === 'object' && !('type' in first);
  const opts = isOpts ? first : {};
  const children: ElementNode[] = isOpts ? args.slice(1) : args;
  return {
    type: NODE_TYPE.STACK,
    children,
    width: opts.width ?? SIZE.FILL,
    height: opts.height ?? SIZE.HUG,
  };
}

/** Shape node (token values baked in from mockTheme) */
function shapeNode(shapeName: string): ShapeNode {
  return {
    type: NODE_TYPE.SHAPE,
    shape: shapeName as any,
    fill: { color: '#666666', opacity: 100 },
    border: { color: '#FFFFFF', width: 0 },
    cornerRadius: 0,
  };
}

/** Slide number node */
function slideNumberNode(opts?: Partial<Omit<SlideNumberNode, 'type'>>): SlideNumberNode {
  return {
    type: NODE_TYPE.SLIDE_NUMBER,
    style: TEXT_STYLE.FOOTER,
    resolvedStyle: mockTheme.textStyles[TEXT_STYLE.FOOTER],
    color: '#666666',
    hAlign: HALIGN.RIGHT,
    vAlign: VALIGN.MIDDLE,
    ...opts,
  };
}

/** Table cell helper */
function cell(text: string, opts?: Partial<TableCellData>): TableCellData {
  return {
    content: [{ text }],
    color: '#000000',
    textStyle: TEXT_STYLE.BODY,
    resolvedStyle: bodyStyle,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
    lineHeightMultiplier: 1.0,
    linkColor: '#0000FF',
    linkUnderline: true,
    ...opts,
  };
}

/** Table node */
function tableNode(rows: TableCellData[][], opts?: Partial<Omit<TableNode, 'type' | 'rows'>>): TableNode {
  return {
    type: NODE_TYPE.TABLE,
    rows,
    borderStyle: BORDER_STYLE.FULL,
    borderColor: '#333333',
    borderWidth: 1,
    headerBackground: '#AAAAAA',
    headerBackgroundOpacity: 100,
    headerTextStyle: TEXT_STYLE.BODY,
    cellBackground: '#EEEEEE',
    cellBackgroundOpacity: 0,
    cellTextStyle: TEXT_STYLE.BODY,
    cellPadding: 0.1,
    hAlign: HALIGN.LEFT,
    vAlign: VALIGN.MIDDLE,
    linkColor: '#0000FF',
    linkUnderline: true,
    ...opts,
  };
}

/** Generate layout HTML from an element node tree */
function genHTML(node: ElementNode, bounds: Bounds) {
  return generateLayoutHTML([{ tree: node, bounds, background: {} }], mockTheme, ['test-slide']);
}

describe('HTML Measurement Generation', () => {
  const bounds = new Bounds(0, 0, 10, 5);

  describe('LayoutContainer (unified Row/Column)', () => {
    test('row generates flex-direction: row', async () => {
      const node = rowNode(textNode('A'), textNode('B'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('flex-direction:row'), 'Row should have flex-direction:row');
    });

    test('column generates flex-direction: column', async () => {
      const node = colNode(textNode('A'), textNode('B'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('flex-direction:column'), 'Column should have flex-direction:column');
    });

    test('row with hAlign center generates justify-content: center', async () => {
      const node = rowNode({ hAlign: HALIGN.CENTER }, textNode('A'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('justify-content:center'), 'Row hAlign center should use justify-content:center');
    });

    test('row with hAlign right generates justify-content: flex-end', async () => {
      const node = rowNode({ hAlign: HALIGN.RIGHT }, textNode('A'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('justify-content:flex-end'), 'Row hAlign right should use justify-content:flex-end');
    });

    test('row with padding generates padding style', async () => {
      const node = rowNode({ padding: 0.5 }, textNode('A'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('padding:'), 'Row with padding should generate padding style');
    });

    test('column with padding generates padding style', async () => {
      const node = colNode({ padding: 0.5 }, textNode('A'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('padding:'), 'Column with padding should generate padding style');
    });
  });

  describe('Text rendering', () => {
    test('text generates width: 100%', async () => {
      const node = textNode('Hello world');
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('width:100%'), 'Text should have width:100%');
    });

    test('text with hAlign center generates text-align: center', async () => {
      const node = textNode('Hello', { hAlign: HALIGN.CENTER });
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('text-align:center'), 'Text with hAlign center should use text-align:center');
    });

    test('text with hAlign right generates text-align: right', async () => {
      const node = textNode('Hello', { hAlign: HALIGN.RIGHT });
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('text-align:right'), 'Text with hAlign right should use text-align:right');
    });
  });

  describe('Bullet rendering', () => {
    test('bullet renders as native ul/li with disc markers', async () => {
      const node = textNode([{ text: 'Item', bullet: true }]);
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('<ul'), 'Bullet should render as <ul>');
      assert.ok(html.includes('<li'), 'Bullet items should render as <li>');
      assert.ok(html.includes('list-style:disc'), 'Bullet list should use disc markers');
    });

    test('bullet list has padding for indent', async () => {
      const node = textNode([{ text: 'Item', bullet: true }]);
      const { html } = await genHTML(node, bounds);
      // ul uses padding shorthand: padding:0 0 0 Npx
      const ulMatch = html.match(/<ul[^>]*style="([^"]*)"/);
      assert.ok(ulMatch, 'Should find <ul> with style');
      assert.ok(ulMatch![1].includes('padding:0 0 0'), 'Bullet list should have left padding for indent');
    });

    test('multi-run bullet renders all runs in one li', async () => {
      // Two runs: bold with bullet, plain without
      const node = textNode([
        { text: 'Bold:', bold: true, bullet: true },
        { text: ' plain text' },
      ]);
      const { html } = await genHTML(node, bounds);
      // The li should contain both the bold and plain spans
      const liMatch = html.match(/<li[^>]*>(.*?)<\/li>/);
      assert.ok(liMatch, 'Should have a <li> element');
      const liContent = liMatch![1];
      assert.ok(liContent.includes('Bold:'), 'li should contain bold text');
      assert.ok(liContent.includes('plain text'), 'li should contain plain text in same element');
    });
  });

  describe('Paragraph spacing', () => {
    test('paragraphBreak generates margin-top spacing', async () => {
      const node = textNode([{ text: 'Para 1' }, { text: 'Para 2', paragraphBreak: true }]);
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('margin-top:1em'), 'paragraphBreak should generate margin-top:1em for paragraph spacing');
    });

    test('paragraphBreak does not generate br tag', async () => {
      const node = textNode([{ text: 'Para 1' }, { text: 'Para 2', paragraphBreak: true }]);
      const { html } = await genHTML(node, bounds);
      assert.ok(!html.includes('<br'), 'paragraphBreak should not use <br> — uses margin-top instead');
    });
  });

  describe('Direction-aware flex item sizing', () => {
    test('row with explicit height in column uses flex: 0 0 (fixed main axis)', async () => {
      // This is the title-slide logo bug: row({ height: 0.33 }) inside a column
      // should NOT get flex: 1 1 0 which would override the explicit height
      const node = colNode(rowNode({ height: 0.33 }, textNode('Logo')));
      const { html } = await genHTML(node, bounds);
      // 0.33 inches * 96 DPI = 31.68px
      assert.ok(html.includes('flex:0 0 31.68px'), 'Row with explicit height in column should get flex:0 0 <height>px');
    });

    test('column with explicit width in row uses flex: 0 0 (fixed main axis)', async () => {
      const node = rowNode(colNode({ width: 3 }, textNode('Left')), textNode('Right'));
      const { html } = await genHTML(node, bounds);
      // 3 inches * 96 DPI = 288px
      assert.ok(html.includes('flex:0 0 288px'), 'Column with explicit width in row should get flex:0 0 <width>px');
    });

    test('row with default HUG height in column uses flex-shrink:0 (content-sized)', async () => {
      // Row defaults to height: HUG. In column parent, height is main axis.
      // HUG main axis → flex-shrink:0, no flex:1 1 0
      const node = colNode(rowNode(textNode('A'), textNode('B')));
      const { html } = await genHTML(node, bounds);
      const rowDivMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(rowDivMatch, 'Should find the row div');
      assert.ok(!rowDivMatch![1].includes('flex:1 1 0'), 'Row with HUG height should NOT get flex:1 1 0');
      assert.ok(rowDivMatch![1].includes('flex-shrink:0'), 'Row with HUG height should get flex-shrink:0');
    });

    test('row with SIZE.FILL height in column fills available space', async () => {
      const node = colNode(rowNode({ height: SIZE.FILL }, textNode('A')));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('flex:1 1 0'), 'Row with SIZE.FILL height should fill');
    });

    test('column with explicit height in column uses flex: 0 0 (cross-axis explicit)', async () => {
      // A column inside another column with fixed height
      const node = colNode(
        colNode({ height: 2 }, textNode('Fixed')),
        textNode('Below'),
      );
      const { html } = await genHTML(node, bounds);
      // 2 inches * 96 = 192px
      assert.ok(html.includes('flex:0 0 192px'), 'Nested column with explicit height should use flex:0 0');
    });

    test('row with explicit height also sets cross-axis height when in row parent', async () => {
      // A row inside another row - height is cross-axis, should use explicit height CSS
      const node = rowNode(rowNode({ height: 1 }, textNode('Inner')));
      const { html } = await genHTML(node, bounds);
      // height is cross-axis in a row parent, so should be explicit CSS height
      assert.ok(html.includes('height:96px'), 'Row with height in row parent should set explicit height CSS');
    });
  });

  describe('Image direction awareness', () => {
    test('image in column gets width: 100%', async () => {
      const node = colNode(imageNode(testImage));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('width:100%'), 'Image in column should get width:100%');
    });

    test('image in row gets height: 100%', async () => {
      const node = rowNode(imageNode(testImage));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('height:100%'), 'Image in row should get height:100%');
    });
  });

  describe('Line direction awareness', () => {
    test('line in column gets width: 100% (horizontal separator)', async () => {
      const node = colNode(textNode('Above'), lineNode(), textNode('Below'));
      const { html } = await genHTML(node, bounds);
      // Line in column = horizontal separator
      assert.ok(html.includes('width:100%'), 'Line in column should be full-width horizontal separator');
    });

    test('line in row gets align-self: stretch (vertical separator)', async () => {
      const node = rowNode(textNode('Left'), lineNode(), textNode('Right'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('align-self:stretch'), 'Line in row should stretch vertically');
    });
  });

  describe('Vertical alignment (safe overflow protection)', () => {
    test('column with vAlign MIDDLE generates safe center', async () => {
      const node = colNode({ vAlign: VALIGN.MIDDLE }, textNode('Centered'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('safe center'), 'vAlign MIDDLE should use "safe center" — prevents content above parent in measurements');
    });

    test('column with vAlign BOTTOM generates safe flex-end', async () => {
      const node = colNode({ vAlign: VALIGN.BOTTOM }, textNode('Bottom'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('safe flex-end'), 'vAlign BOTTOM should use "safe flex-end"');
    });

    test('column with vAlign TOP (default) generates flex-start (no safe needed)', async () => {
      const node = colNode(textNode('Top'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('justify-content:flex-start'), 'vAlign TOP should use plain flex-start');
    });
  });

  describe('Cross-axis stretch (containers fill parent height in rows)', () => {
    test('row defaults to align-items: stretch (vAlign: TOP)', async () => {
      // Row defaults to VALIGN.TOP → align-items: stretch.
      // Children fill row height natively — no explicit height: 100% needed.
      const node = rowNode(colNode(textNode('Card content')));
      const { html } = await genHTML(node, bounds);
      const rowMatch = html.match(/data-node-id="node-1"[^>]*style="([^"]*)"/);
      assert.ok(rowMatch, 'Should find the row div');
      assert.ok(rowMatch![1].includes('align-items:stretch'), 'Row should default to align-items:stretch');
    });

    test('row with vAlign MIDDLE uses align-items: center', async () => {
      const node = rowNode({ vAlign: VALIGN.MIDDLE }, colNode(textNode('Nested')));
      const { html } = await genHTML(node, bounds);
      const rowMatch = html.match(/data-node-id="node-1"[^>]*style="([^"]*)"/);
      assert.ok(rowMatch, 'Should find the row div');
      assert.ok(rowMatch![1].includes('align-items:center'), 'Row with vAlign MIDDLE should use center');
    });

    test('container in row: FILL width (main axis) gets flex:1 1 0 and min-width:0', async () => {
      // Column in row: width=FILL (main axis) → flex:1 1 0, minWidth:0
      // height=HUG (cross axis) → omit (stretch handles it)
      const node = rowNode(colNode(textNode('A')));
      const { html } = await genHTML(node, bounds);
      const columnMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the nested column div');
      assert.ok(columnMatch![1].includes('flex:1 1 0'), 'Column in row should get flex:1 1 0 (FILL main axis)');
      assert.ok(columnMatch![1].includes('min-width:0'), 'Column in row should have min-width:0 (FILL main axis)');
    });

    test('stack grid uses minmax(min-content, 1fr) to prevent content collapse', async () => {
      // Grid tracks must be at least content-sized to prevent children from collapsing to zero height
      const node = colNode(stackNode(shapeNode(SHAPE.ROUND_RECT), colNode(textNode('Content'))));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('minmax(min-content, 1fr)'), 'Stack grid should use minmax(min-content, 1fr)');
    });

    test('container in row omits height (stretch handles cross-axis fill)', async () => {
      // align-items: stretch on the row makes children fill the row height natively.
      // No explicit height: 100% needed — CSS stretch does the work.
      const node = rowNode(colNode(textNode('A')), colNode(textNode('B')));
      const { html } = await genHTML(node, bounds);
      const columnMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the nested column div');
      assert.ok(!columnMatch![1].includes('height:100%'), 'Column in row should not have height:100% (stretch handles it)');
    });

    test('stack in row omits height (stretch handles card equal height)', async () => {
      // Stacks (used by card component) in rows rely on align-items: stretch for equal height.
      const node = rowNode(stackNode(shapeNode(SHAPE.ROUND_RECT), colNode(textNode('Card'))));
      const { html } = await genHTML(node, bounds);
      const stackMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(stackMatch, 'Should find the stack div');
      assert.ok(!stackMatch![1].includes('height:100%'), 'Stack in row should not have height:100% (stretch handles it)');
    });

    test('stack child (grid item) is flex container filling the grid cell', async () => {
      // Grid items inside stack must be flex containers so children fill the grid cell.
      // Compression is handled by LayoutStack's grid template (heightIsConstrained),
      // not by min-height/overflow on the grid item wrapper.
      const node = colNode(stackNode(shapeNode(SHAPE.ROUND_RECT), colNode(textNode('Content'))));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('grid-area:1 / 1 / 2 / 2;display:flex;flex-direction:column'), 'Stack child should be flex container');
      assert.ok(!html.includes('overflow:hidden'), 'Stack child should NOT have overflow:hidden (compression is in grid template)');
    });

    test('column with SIZE.FILL inside stack gets flex:1 1 0 (fills stack for centering)', async () => {
      // Components like quote() explicitly set height: SIZE.FILL on their content column
      // so that vAlign: MIDDLE centering works when the stack has definite height.
      // Node IDs: stack=node-1, shape=node-2, column=node-3, text=node-4
      const node = stackNode(shapeNode(SHAPE.ROUND_RECT), colNode({ vAlign: VALIGN.MIDDLE, height: SIZE.FILL }, textNode('Centered')));
      const { html } = await genHTML(node, bounds);
      const columnMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the column inside stack (node-3)');
      assert.ok(columnMatch![1].includes('flex:1 1 0'), 'Column with SIZE.FILL in stack should get flex:1 1 0');
      // No min-height:0 here — the stack defaults to HUG, which breaks the
      // heightIsConstrained chain. min-height:0 only appears when the full
      // height chain from slide root is definite (FILL or fixed px).
      assert.ok(!columnMatch![1].includes('min-height:0'), 'Column in HUG stack should NOT have min-height:0 (chain is broken)');
    });

    test('column without SIZE.FILL inside stack uses intrinsic height (no flex grow)', async () => {
      // Cards and other stack-based components without explicit SIZE.FILL should
      // preserve intrinsic content height — no flex:1 that could collapse content.
      // Node IDs: stack=node-1, shape=node-2, column=node-3, text=node-4
      const node = stackNode(shapeNode(SHAPE.ROUND_RECT), colNode({ vAlign: VALIGN.MIDDLE }, textNode('Content')));
      const { html } = await genHTML(node, bounds);
      const columnMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the column inside stack (node-3)');
      assert.ok(!columnMatch![1].includes('flex:1 1 0'), 'Column without SIZE.FILL should NOT get flex:1 1 0');
    });
  });

  describe('Compressibility rules', () => {
    test('image in constrained column is compressible (flex: 1 1 0, min-height: 0)', async () => {
      const node = colNode({ height: SIZE.FILL }, imageNode(testImage));
      const { html } = await genHTML(node, bounds);
      const imageMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      // Image in constrained column: grows to fill and can compress (min-height:0)
      assert.ok(imageMatch![1].includes('flex:1 1 0'), 'Image in constrained column should grow to fill (flex:1 1 0)');
      assert.ok(imageMatch![1].includes('min-height:0'), 'Image in constrained column should be compressible (min-height:0)');
      // max-height uses min() with cqw to cap at proportional height from container width
      assert.ok(imageMatch![1].includes('min('), 'Image in constrained column should have min() max-height');
      assert.ok(imageMatch![1].includes('cqw'), 'Image max-height should use container query units (cqw)');
    });

    test('column containers have container-type: inline-size for cqw units', async () => {
      const node = colNode(imageNode(testImage));
      const { html } = await genHTML(node, bounds);
      const colMatch = html.match(/data-node-id="node-1"[^>]*style="([^"]*)"/);
      assert.ok(colMatch, 'Should find the column div');
      assert.ok(colMatch![1].includes('container-type:inline-size'), 'Column should have container-type:inline-size');
    });

    test('HUG-width column does NOT get container-type (would collapse width)', async () => {
      const node = rowNode(colNode({ width: SIZE.HUG }, textNode('Narrow')));
      const { html } = await genHTML(node, bounds);
      const colMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(colMatch, 'Should find the HUG column div');
      assert.ok(!colMatch![1].includes('container-type'), 'HUG column must NOT have container-type');
    });

    test('Stack child wrapper has container-type: inline-size', async () => {
      const node = stackNode(imageNode(testImage));
      const { html } = await genHTML(node, bounds);
      // Stack wrapper is the anonymous div between the stack and its child
      assert.ok(html.includes('container-type:inline-size'), 'Stack wrapper should have container-type:inline-size');
    });

    test('image in auto-height row shares width equally (flex: 1 1 0)', async () => {
      // Row with no explicit height: image has no height anchor for aspect-ratio,
      // so it must share space equally with siblings
      const node = rowNode(imageNode(testImage), textNode('Description'));
      const { html } = await genHTML(node, bounds);
      const imageMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      assert.ok(imageMatch![1].includes('flex:1 1 0'), 'Image in auto-height row should share width (flex:1 1 0)');
      assert.ok(imageMatch![1].includes('min-width:0px'), 'Image in auto-height row should have min-width:0px');
    });

    test('image in definite-height row uses natural aspect-ratio width (flex: 0 1 auto)', async () => {
      // Row with explicit height: height: 100% resolves, aspect-ratio derives width.
      // Image should NOT grow to fill — it should be naturally sized.
      const node = rowNode({ height: 0.33 }, imageNode(testImage));
      const { html } = await genHTML(node, bounds);
      const imageMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      assert.ok(imageMatch![1].includes('flex:0 1 auto'), 'Image in definite-height row should use natural width (flex:0 1 auto)');
      assert.ok(!imageMatch![1].includes('flex:1 1 0'), 'Image in definite-height row should NOT grow to fill');
    });

    test('image in SIZE.FILL row uses natural aspect-ratio width (flex: 0 1 auto)', async () => {
      // Row with SIZE.FILL height: also definite (resolves via flex: 1 1 0 on the row itself)
      const node = colNode(rowNode({ height: SIZE.FILL }, imageNode(testImage)));
      const { html } = await genHTML(node, bounds);
      const imageMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      assert.ok(imageMatch![1].includes('flex:0 1 auto'), 'Image in SIZE.FILL row should use natural width (flex:0 1 auto)');
    });

    test('text in column is incompressible (width: 100%, flex-shrink: 0)', async () => {
      const node = colNode(textNode('Do not compress me'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('flex-shrink:0'), 'Text in column should have flex-shrink:0 (incompressible height)');
      assert.ok(html.includes('width:100%'), 'Text in column should have width:100%');
    });

    test('text in row shares width (flex: 1 1 0, min-width: 0)', async () => {
      const node = rowNode(imageNode(testImage), textNode('Description beside image'));
      const { html } = await genHTML(node, bounds);
      // Text in a row should share width, not claim 100%
      const textMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(textMatch, 'Should find the text div');
      assert.ok(textMatch![1].includes('flex:1 1 0'), 'Text in row should use flex:1 1 0 to share width');
      assert.ok(textMatch![1].includes('min-width:0px'), 'Text in row should have min-width:0px to allow shrinking');
      assert.ok(!textMatch![1].includes('width:100%'), 'Text in row should NOT have width:100%');
    });

    test('container in column: HUG height (main axis) gets flex-shrink:0', async () => {
      // Row in column: height=HUG (main axis) → flexShrink:0 (content-sized, don't compress)
      // width=FILL (cross axis) → width:100%
      const node = colNode(rowNode(textNode('A'), textNode('B')));
      const { html } = await genHTML(node, bounds);
      const rowDivMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(rowDivMatch, 'Should find the row div');
      assert.ok(rowDivMatch![1].includes('flex-shrink:0'), 'Row in column should have flex-shrink:0 (HUG main axis)');
      assert.ok(rowDivMatch![1].includes('width:100%'), 'Row in column should have width:100% (FILL cross axis)');
    });
  });

  describe('heightIsConstrained propagation', () => {
    // V2 padding fix: only images get min-height:0 in constrained contexts.
    // Containers keep min-height:auto to preserve their padding boundaries.
    // These tests verify the constraint propagates correctly to images.

    test('FILL chain propagates constraint to image (min-height:0)', async () => {
      // Slide root (constrained) → FILL column → FILL column → FILL column → image
      // The entire chain is definite, so the image in a column gets min-height:0.
      // Containers do NOT get min-height:0 (padding fix).
      // node-1: outer column, node-2: middle column, node-3: inner column, node-4: image
      const node = colNode({ height: SIZE.FILL },
        colNode({ height: SIZE.FILL },
          colNode({ height: SIZE.FILL }, imageNode(testImage)),
        ),
      );
      const { html } = await genHTML(node, bounds);
      const imageMatch = html.match(/data-node-id="node-4"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image (node-4)');
      assert.ok(imageMatch![1].includes('min-height:0'), 'Image at end of FILL chain should be compressible (min-height:0)');
      // The inner column should NOT have min-height:0 (padding preserved)
      const colMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(colMatch, 'Should find the inner column (node-3)');
      assert.ok(!colMatch![1].includes('min-height:0'), 'Column container should NOT have min-height:0 (padding fix)');
    });

    test('HUG breaks chain, fixed px restarts it', async () => {
      // Slide root (constrained) → HUG column (breaks) → fixed column (restarts) → FILL column → image
      // node-1: outer HUG column, node-2: fixed column, node-3: inner FILL column, node-4: image
      const node = colNode(
        colNode({ height: 2 },
          colNode({ height: SIZE.FILL }, imageNode('./test/fixtures/test.png')),
        ),
      );
      const { html } = await genHTML(node, bounds);
      const imageMatch = html.match(/data-node-id="node-4"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find image (node-4)');
      assert.ok(imageMatch![1].includes('min-height:0'), 'Fixed px parent should restart chain — image gets min-height:0');
      // The FILL column should NOT have min-height:0
      const innerCol = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(innerCol, 'Should find inner FILL column (node-3)');
      assert.ok(innerCol![1].includes('flex:1 1 0'), 'Inner column should be FILL');
      assert.ok(!innerCol![1].includes('min-height:0'), 'FILL column should NOT have min-height:0 (padding fix)');
    });

    test('stack preserves min-content grid template even in constrained context', async () => {
      // V2: stacks always use minmax(min-content, 1fr) — never compress to zero.
      // This preserves card content and padding boundaries.
      // node-1: column, node-2: stack, node-3: shape, node-4: column, node-5: text
      const node = colNode({ height: SIZE.FILL },
        stackNode({ height: SIZE.FILL }, shapeNode(SHAPE.ROUND_RECT), colNode(textNode('Content'))),
      );
      const { html } = await genHTML(node, bounds);
      const stackMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(stackMatch, 'Should find the stack (node-2)');
      assert.ok(stackMatch![1].includes('min-content'), 'Stack should use min-content grid template (preserves padding)');
      assert.ok(!stackMatch![1].includes('minmax(0'), 'Stack should NOT use minmax(0, ...) (would allow crushing content)');
    });

    test('row passes constraint through to images in nested columns', async () => {
      // Slide root (constrained) → FILL column → FILL row → FILL column → image
      // The row passes through the constraint, so the image gets min-height:0.
      // node-1: outer column, node-2: row, node-3: column, node-4: image
      const node = colNode({ height: SIZE.FILL },
        rowNode({ height: SIZE.FILL },
          colNode({ height: SIZE.FILL }, imageNode('./test/fixtures/test.png')),
        ),
      );
      const { html } = await genHTML(node, bounds);
      const imageMatch = html.match(/data-node-id="node-4"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image (node-4)');
      assert.ok(imageMatch![1].includes('min-height:0'), 'Row should pass constraint through — image gets min-height:0');
      // Column should NOT have min-height:0
      const colMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(colMatch, 'Should find the column (node-3)');
      assert.ok(!colMatch![1].includes('min-height:0'), 'Column should NOT have min-height:0 (padding fix)');
    });

    test('HUG row breaks chain for its children', async () => {
      // Slide root (constrained) → FILL column → HUG row → FILL column
      // The row defaults to HUG height, which breaks the chain.
      // The inner FILL column should NOT get min-height:0.
      // node-1: outer column, node-2: row (HUG), node-3: inner column, node-4: text
      const node = colNode({ height: SIZE.FILL },
        rowNode(
          colNode({ height: SIZE.FILL }, textNode('inside HUG row')),
        ),
      );
      const { html } = await genHTML(node, bounds);
      const innerCol = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(innerCol, 'Should find inner column (node-3)');
      assert.ok(innerCol![1].includes('flex:1 1 0'), 'Inner column should be FILL');
      assert.ok(!innerCol![1].includes('min-height:0'), 'HUG row should break chain — inner column should NOT get min-height:0');
    });

    test('image in constrained column gets min-height:0 through row', async () => {
      // Slide root (constrained) → FILL column → FILL row → FILL column → image
      // The row passes constraint through, so the image in the inner column gets min-height:0.
      // node-1: outer column, node-2: row, node-3: inner column, node-4: image
      const node = colNode({ height: SIZE.FILL },
        rowNode({ height: SIZE.FILL },
          colNode({ height: SIZE.FILL }, imageNode(testImage)),
        ),
      );
      const { html } = await genHTML(node, bounds);
      const imgMatch = html.match(/data-node-id="node-4"[^>]*style="([^"]*)"/);
      assert.ok(imgMatch, 'Should find image (node-4)');
      assert.ok(imgMatch![1].includes('min-height:0'), 'Image in column inside constrained row should get min-height:0');
    });
  });

  // ============================================
  // Property gap coverage tests
  // ============================================

  describe('Shape rendering', () => {
    test('shape with full opacity uses hex background color', async () => {
      const node = colNode(stackNode(
        shapeNode(SHAPE.ROUND_RECT),
        colNode(textNode('Content')),
      ));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('background-color:#666666'), 'Shape with 100% opacity should use hex color');
    });

    test('shape with partial opacity uses rgba background', async () => {
      const shape: ShapeNode = {
        type: NODE_TYPE.SHAPE,
        shape: SHAPE.ROUND_RECT,
        fill: { color: '#BDB0E0', opacity: 20 },
        border: { color: '#FFFFFF', width: 0 },
        cornerRadius: 0,
      };
      const node = colNode(stackNode(shape, colNode(textNode('Content'))));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('rgba(189,176,224,0.2)'), 'Shape with 20% opacity should use rgba');
      assert.ok(!html.includes('opacity:0.2'), 'Should NOT use CSS opacity (makes borders transparent too)');
    });

    test('ellipse shape gets border-radius: 50%', async () => {
      const shape: ShapeNode = {
        type: NODE_TYPE.SHAPE,
        shape: SHAPE.ELLIPSE,
        fill: { color: '#FF0000', opacity: 100 },
        border: { color: '#FFFFFF', width: 0 },
        cornerRadius: 0,
      };
      const node = colNode(stackNode(shape, colNode(textNode('Circle'))));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('border-radius:50%'), 'Ellipse should get border-radius:50%');
    });

    test('shape with cornerRadius gets pixel border-radius', async () => {
      const shape: ShapeNode = {
        type: NODE_TYPE.SHAPE,
        shape: SHAPE.ROUND_RECT,
        fill: { color: '#333333', opacity: 100 },
        border: { color: '#FFFFFF', width: 0 },
        cornerRadius: 0.1,
      };
      const node = colNode(stackNode(shape, colNode(textNode('Rounded'))));
      const { html } = await genHTML(node, bounds);
      // 0.1 inches * 96 DPI ≈ 9.6px (floating point may add trailing digits)
      assert.ok(html.match(/border-radius:9\.6\d*px/), 'cornerRadius should map to pixels (0.1in ≈ 9.6px)');
    });

    test('shape with border renders solid border', async () => {
      const shape: ShapeNode = {
        type: NODE_TYPE.SHAPE,
        shape: SHAPE.ROUND_RECT,
        fill: { color: '#333333', opacity: 100 },
        border: { color: '#AABBCC', width: 2 },
        cornerRadius: 0,
      };
      const node = colNode(stackNode(shape, colNode(textNode('Bordered'))));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('#AABBCC'), 'Border color should appear in HTML');
      assert.ok(html.includes('solid'), 'Border should be solid');
    });

    test('shape with selective borders renders per-side', async () => {
      const shape: ShapeNode = {
        type: NODE_TYPE.SHAPE,
        shape: SHAPE.ROUND_RECT,
        fill: { color: '#333333', opacity: 100 },
        border: { color: '#FF0000', width: 2, top: true, right: false, bottom: true, left: false },
        cornerRadius: 0,
      };
      const node = colNode(stackNode(shape, colNode(textNode('Selective'))));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('border-right:none'), 'Right border should be none');
      assert.ok(html.includes('border-left:none'), 'Left border should be none');
    });
  });

  describe('SlideNumber rendering', () => {
    test('slideNumber renders with correct color', async () => {
      const node = rowNode(textNode('Footer'), slideNumberNode({ color: '#BDB0E0' }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('color:#BDB0E0'), 'SlideNumber should render with its color');
    });

    test('slideNumber with hAlign RIGHT renders text-align:right', async () => {
      const node = rowNode(textNode('Footer'), slideNumberNode({ hAlign: HALIGN.RIGHT }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('text-align:right'), 'SlideNumber should have text-align:right');
    });

    test('slideNumber with hAlign CENTER renders text-align:center', async () => {
      const node = rowNode(textNode('Footer'), slideNumberNode({ hAlign: HALIGN.CENTER }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('text-align:center'), 'SlideNumber with CENTER should have text-align:center');
    });

    test('slideNumber with vAlign MIDDLE renders safe center', async () => {
      const node = rowNode(textNode('Footer'), slideNumberNode({ vAlign: VALIGN.MIDDLE }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('safe center'), 'SlideNumber with MIDDLE should use safe center');
    });

    test('slideNumber uses flex: 0 0 auto (content-sized)', async () => {
      const node = rowNode(textNode('Footer'), slideNumberNode());
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('flex:0 0 auto'), 'SlideNumber should be content-sized (flex:0 0 auto)');
    });

    test('slideNumber renders placeholder text', async () => {
      const node = rowNode(slideNumberNode());
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('999'), 'SlideNumber should render placeholder text 999');
    });
  });

  describe('Table rendering', () => {
    test('table uses CSS grid with correct column count', async () => {
      const rows = [
        [cell('A'), cell('B'), cell('C')],
        [cell('D'), cell('E'), cell('F')],
      ];
      const node = colNode(tableNode(rows));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('display:grid'), 'Table should use CSS grid');
      assert.ok(html.includes('repeat(3'), 'Table with 3 columns should have repeat(3, ...)');
    });

    test('table FULL border style renders outline', async () => {
      const rows = [[cell('A'), cell('B')]];
      const node = colNode(tableNode(rows, { borderStyle: BORDER_STYLE.FULL }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('outline:'), 'FULL border should use outline for outer border');
    });

    test('table NONE border style renders no outline', async () => {
      const rows = [[cell('A'), cell('B')]];
      const node = colNode(tableNode(rows, { borderStyle: BORDER_STYLE.NONE }));
      const { html } = await genHTML(node, bounds);
      assert.ok(!html.includes('outline:'), 'NONE border should have no outline');
    });

    test('table HORIZONTAL border style renders top/bottom only', async () => {
      const rows = [[cell('A'), cell('B')]];
      const node = colNode(tableNode(rows, { borderStyle: BORDER_STYLE.HORIZONTAL }));
      const { html } = await genHTML(node, bounds);
      // The outer table div should have border-top and border-bottom
      const tableMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(tableMatch, 'Should find table div');
      assert.ok(tableMatch![1].includes('border-top:'), 'HORIZONTAL should have top border');
      assert.ok(tableMatch![1].includes('border-bottom:'), 'HORIZONTAL should have bottom border');
    });

    test('table header row gets background color', async () => {
      const rows = [
        [cell('Header 1'), cell('Header 2')],
        [cell('Data 1'), cell('Data 2')],
      ];
      const node = colNode(tableNode(rows, {
        headerRows: 1,
        headerBackground: '#FF0000',
        headerBackgroundOpacity: 100,
      }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('#FF0000'), 'Header cells should have background color');
    });

    test('table non-header cells get cellBackground when opacity > 0', async () => {
      const rows = [
        [cell('Header')],
        [cell('Data')],
      ];
      const node = colNode(tableNode(rows, {
        headerRows: 1,
        headerBackground: '#FF0000',
        headerBackgroundOpacity: 100,
        cellBackground: '#00FF00',
        cellBackgroundOpacity: 50,
      }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('rgba(0,255,0,0.5)'), 'Non-header cell should get cellBackground with rgba opacity');
    });

    test('table cell-level fill overrides header background', async () => {
      const rows = [
        [cell('Header', { fill: '#AABBCC' }), cell('Header 2')],
        [cell('Data')],
      ];
      const node = colNode(tableNode(rows, {
        headerRows: 1,
        headerBackground: '#FF0000',
        headerBackgroundOpacity: 100,
      }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('#AABBCC'), 'Cell-level fill should override header background');
    });

    test('table colspan renders grid-column span', async () => {
      const rows = [
        [cell('Spanning', { colspan: 2 }), cell('Normal')],
        [cell('A'), cell('B'), cell('C')],
      ];
      const node = colNode(tableNode(rows));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('grid-column:span 2'), 'colspan:2 should generate grid-column:span 2');
    });

    test('table rowspan renders grid-row span', async () => {
      const rows = [
        [cell('Tall', { rowspan: 2 }), cell('B')],
        [cell('C'), cell('D')],
      ];
      const node = colNode(tableNode(rows));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('grid-row:span 2'), 'rowspan:2 should generate grid-row:span 2');
    });

    test('table in row gets flex: 1 1 0 (shares width)', async () => {
      const rows = [[cell('A')]];
      const node = rowNode(textNode('Left'), tableNode(rows));
      const { html } = await genHTML(node, bounds);
      // Find the table div (node-2 = text, node-3 = table)
      const tableMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(tableMatch, 'Should find the table div');
      assert.ok(tableMatch![1].includes('flex:1 1 0'), 'Table in row should share width (flex:1 1 0)');
    });
  });

  describe('Bullet rendering', () => {
    test('bullet items render as li with margin/padding reset', async () => {
      const node = textNode([
        { text: 'Item', bullet: true },
      ]);
      const { html } = await genHTML(node, bounds);
      const liMatch = html.match(/<li[^>]*style="([^"]*)"/);
      assert.ok(liMatch, 'Should find <li> with style');
      assert.ok(liMatch![1] === 'margin:0;padding:0', 'li should only have margin/padding reset');
    });
  });

  describe('SoftBreak rendering', () => {
    test('softBreak renders as br tag (not paragraph spacing)', async () => {
      const node = textNode([
        { text: 'Line one' },
        { text: 'Line two', softBreak: true },
      ]);
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('<br/>'), 'softBreak should render as <br/>');
    });

    test('softBreak does not add paragraph margin', async () => {
      const node = textNode([
        { text: 'Line one' },
        { text: 'Line two', softBreak: true },
      ]);
      const { html } = await genHTML(node, bounds);
      assert.ok(!html.includes('margin-top:1em'), 'softBreak should NOT have paragraph margin');
    });

    test('softBreak is distinct from paragraphBreak', async () => {
      const node = textNode([
        { text: 'Line one' },
        { text: 'Soft', softBreak: true },
        { text: 'Para', paragraphBreak: true },
      ]);
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('<br/>'), 'softBreak should produce <br/>');
      assert.ok(html.includes('margin-top:1em'), 'paragraphBreak should produce margin-top:1em');
    });
  });

  describe('Line dashType rendering', () => {
    test('solid line in column uses border-top with solid style', async () => {
      const node = colNode(
        textNode('Above'),
        lineNode(),
        textNode('Below'),
      );
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('border-top:'), 'Line in column should use border-top');
      assert.ok(html.includes('solid'), 'Solid line should have solid border style');
    });

    test('dashed line renders border-style: dashed', async () => {
      const line: LineNode = { type: NODE_TYPE.LINE, color: '#666666', width: 1, dashType: DASH_TYPE.DASH };
      const node = colNode(textNode('Above'), line, textNode('Below'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('dashed'), 'DASH type should render as dashed border');
    });

    test('dotted line renders border-style: dotted', async () => {
      const line: LineNode = { type: NODE_TYPE.LINE, color: '#666666', width: 1, dashType: DASH_TYPE.SYS_DOT };
      const node = colNode(textNode('Above'), line, textNode('Below'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('dotted'), 'SYS_DOT type should render as dotted border');
    });

    test('line in row uses border-left (vertical separator)', async () => {
      const line: LineNode = { type: NODE_TYPE.LINE, color: '#FF0000', width: 2, dashType: DASH_TYPE.DASH };
      const node = rowNode(textNode('Left'), line, textNode('Right'));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('border-left:'), 'Line in row should use border-left (vertical separator)');
      assert.ok(html.includes('dashed'), 'Dashed line in row should have dashed style');
      assert.ok(html.includes('#FF0000'), 'Line should use its color');
    });

    test('LG_DASH maps to dashed', async () => {
      const line: LineNode = { type: NODE_TYPE.LINE, color: '#000000', width: 1, dashType: DASH_TYPE.LG_DASH };
      const node = colNode(line);
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('dashed'), 'LG_DASH should map to dashed');
    });

    test('SYS_DASH maps to dotted', async () => {
      const line: LineNode = { type: NODE_TYPE.LINE, color: '#000000', width: 1, dashType: DASH_TYPE.SYS_DASH };
      const node = colNode(line);
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('dotted'), 'SYS_DASH should map to dotted');
    });
  });

  describe('Table headerColumns', () => {
    test('headerColumns marks left column cells as header with background', async () => {
      const rows = [
        [cell('Row Label'), cell('Data 1')],
        [cell('Row Label 2'), cell('Data 2')],
      ];
      const node = colNode(tableNode(rows, {
        headerRows: 0,
        headerColumns: 1,
        headerBackground: '#AA00AA',
        headerBackgroundOpacity: 100,
      }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('#AA00AA'), 'Left column cells should get header background from headerColumns');
    });

    test('headerColumns + headerRows both apply header background', async () => {
      const rows = [
        [cell('Corner'), cell('Col Header')],
        [cell('Row Header'), cell('Data')],
      ];
      const node = colNode(tableNode(rows, {
        headerRows: 1,
        headerColumns: 1,
        headerBackground: '#BB00BB',
        headerBackgroundOpacity: 100,
      }));
      const { html } = await genHTML(node, bounds);
      // All cells except bottom-right "Data" should be header
      const bgMatches = html.match(/#BB00BB/g);
      assert.ok(bgMatches && bgMatches.length === 3, `Expected 3 header-bg cells (corner + col header + row header), got ${bgMatches?.length}`);
    });
  });

  describe('Table cellBackground at full opacity', () => {
    test('cellBackgroundOpacity 100 uses hex color (not rgba)', async () => {
      const rows = [
        [cell('Header')],
        [cell('Data')],
      ];
      const node = colNode(tableNode(rows, {
        headerRows: 1,
        headerBackground: '#FF0000',
        headerBackgroundOpacity: 100,
        cellBackground: '#00FF00',
        cellBackgroundOpacity: 100,
      }));
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('#00FF00'), 'Full opacity cellBackground should use hex color');
      assert.ok(!html.includes('rgba(0,255,0'), 'Full opacity should NOT use rgba');
    });
  });

  describe('escapeHtml edge cases', () => {
    test('HTML entities in text are escaped (ampersand, angle brackets)', async () => {
      const node = textNode([{ text: 'A < B & C > D "quoted"' }]);
      const { html } = await genHTML(node, bounds);
      assert.ok(html.includes('&amp;'), 'Ampersand should be escaped to &amp;');
      assert.ok(html.includes('&lt;'), 'Less-than should be escaped to &lt;');
      assert.ok(html.includes('&gt;'), 'Greater-than should be escaped to &gt;');
      assert.ok(html.includes('&quot;'), 'Double quote should be escaped to &quot;');
      assert.ok(!html.includes('< B'), 'Raw < should not appear in output');
    });

    test('escaping preserves measurement accuracy (no double-encoding)', async () => {
      const node = textNode([{ text: "it's a test" }]);
      const { html } = await genHTML(node, bounds);
      // Hono JSX auto-escapes children, but our text goes through dangerouslySetInnerHTML
      // via renderRunSpanHTML. The escapeHtml function runs once — verify no double-encoding.
      assert.ok(!html.includes('&amp;#'), 'Should NOT have double-encoded entities');
      assert.ok(!html.includes('&amp;amp;'), 'Should NOT have double-encoded ampersands');
    });
  });

  describe('perSlideHtml preview nav bar', () => {
    test('single slide has no prev/next links', async () => {
      const node = colNode(textNode('Solo'));
      const { perSlideHtml } = await genHTML(node, bounds);
      assert.strictEqual(perSlideHtml.length, 1, 'Should have exactly 1 per-slide HTML');
      assert.ok(perSlideHtml[0].includes('<strong>test-slide</strong>'), 'Nav bar should show slide label');
      assert.ok(!perSlideHtml[0].includes('prev'), 'Single slide should have no prev link');
      assert.ok(!perSlideHtml[0].includes('next'), 'Single slide should have no next link');
    });

    test('multi-slide generates prev/next navigation links', async () => {
      const slides = [
        { tree: colNode(textNode('Slide 1')) as ElementNode, bounds, background: {} },
        { tree: colNode(textNode('Slide 2')) as ElementNode, bounds, background: {} },
        { tree: colNode(textNode('Slide 3')) as ElementNode, bounds, background: {} },
      ];
      const result = generateLayoutHTML(slides, mockTheme, ['slide-1', 'slide-2', 'slide-3']);
      assert.strictEqual(result.perSlideHtml.length, 3);

      // First slide: no prev, has next
      assert.ok(!result.perSlideHtml[0].includes('prev'), 'First slide should not have prev link');
      assert.ok(result.perSlideHtml[0].includes('next'), 'First slide should have next link');
      assert.ok(result.perSlideHtml[0].includes('slide-2.html'), 'First slide next should link to slide-2.html');

      // Middle slide: has prev and next
      assert.ok(result.perSlideHtml[1].includes('prev'), 'Middle slide should have prev link');
      assert.ok(result.perSlideHtml[1].includes('next'), 'Middle slide should have next link');
      assert.ok(result.perSlideHtml[1].includes('slide-1.html'), 'Middle slide prev should link to slide-1.html');
      assert.ok(result.perSlideHtml[1].includes('slide-3.html'), 'Middle slide next should link to slide-3.html');

      // Last slide: has prev, no next
      assert.ok(result.perSlideHtml[2].includes('prev'), 'Last slide should have prev link');
      assert.ok(!result.perSlideHtml[2].includes('next'), 'Last slide should not have next link');
      assert.ok(result.perSlideHtml[2].includes('slide-2.html'), 'Last slide prev should link to slide-2.html');
    });

    test('perSlideHtml is full HTML document with doctype', async () => {
      const node = colNode(textNode('Content'));
      const { perSlideHtml } = await genHTML(node, bounds);
      assert.ok(perSlideHtml[0].startsWith('<!DOCTYPE html>'), 'Should start with DOCTYPE');
      assert.ok(perSlideHtml[0].includes('<html>'), 'Should contain html tag');
      assert.ok(perSlideHtml[0].includes('<body>'), 'Should contain body tag');
    });
  });

  describe('Slide Background', () => {
    test('color background renders as hex', async () => {
      const node = colNode(textNode('Hello'));
      const { html } = generateLayoutHTML(
        [{ tree: node, bounds, background: { color: '#120E22' } }],
        mockTheme, ['test-slide'],
      );
      assert.ok(html.includes('background-color:#120E22'), 'Should render hex background color');
      assert.ok(!html.includes('#FFFFFF'), 'Should not contain white fallback');
    });

    test('color with opacity renders as rgba', async () => {
      const node = colNode(textNode('Hello'));
      const { html } = generateLayoutHTML(
        [{ tree: node, bounds, background: { color: '#FF0000', opacity: 50 } }],
        mockTheme, ['test-slide'],
      );
      assert.ok(html.includes('rgba(255,0,0,0.5)'), 'Should render rgba with 50% opacity');
    });

    test('color with full opacity renders as hex', async () => {
      const node = colNode(textNode('Hello'));
      const { html } = generateLayoutHTML(
        [{ tree: node, bounds, background: { color: '#0000FF', opacity: 100 } }],
        mockTheme, ['test-slide'],
      );
      assert.ok(html.includes('background-color:#0000FF'), 'Should render hex at full opacity');
    });

    test('empty background object sets no background-color', async () => {
      const node = colNode(textNode('Hello'));
      const { html } = generateLayoutHTML(
        [{ tree: node, bounds, background: {} }],
        mockTheme, ['test-slide'],
      );
      assert.ok(!html.includes('background-color:'), 'Empty background should not set any background-color');
    });
  });
});
