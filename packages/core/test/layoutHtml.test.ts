// HTML Measurement Tests
// Tests for HTML generation used in browser-based text measurement

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { generateLayoutHTML } from '../dist/layout/layoutHtml.js';
import { prose, label, text, row, column, image, line, stack, shape } from '../dist/dsl/index.js';
import { componentRegistry } from '../dist/core/registry.js';
import { Bounds } from '../dist/core/bounds.js';
import { Component, HALIGN, VALIGN, SIZE, SHAPE, DASH_TYPE, TEXT_STYLE, GAP, BORDER_STYLE } from '../dist/core/types.js';
import type { Theme } from '../dist/core/types.js';
import type { ElementNode } from '../dist/core/nodes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal theme for testing - matches Theme interface from types.ts
const testImage = path.join(__dirname, 'fixtures', 'test.png');
const mockFont = { name: 'Arial', path: path.join(__dirname, 'fixtures', 'test-font.woff2') };
const mockFontFamily = { normal: mockFont };

const mockTheme: Theme = {
  colors: {
    primary: '000000',
    background: 'FFFFFF',
    secondary: '666666',
    accents: {
      blue: '0066CC',
      green: '00CC66',
      orange: 'CC6600',
    },
    text: '000000',
    textMuted: '666666',
    subtleOpacity: 20,
  },
  components: {
    [Component.Card]: { variants: { default: {
      padding: 0.25,
      cornerRadius: 0.1,
      backgroundColor: '666666',
      backgroundOpacity: 20,
      borderColor: '666666',
      borderWidth: 1,
      titleStyle: TEXT_STYLE.H4,
      descriptionStyle: TEXT_STYLE.SMALL,
      gap: GAP.TIGHT,
    }}},
    [Component.Quote]: { variants: { default: {
      padding: 0.5,
      cornerRadius: 0.1,
      backgroundColor: '666666',
      backgroundOpacity: 20,
      borderColor: '666666',
      borderWidth: 1,
      attributionStyle: TEXT_STYLE.SMALL,
      gap: GAP.NORMAL,
    }}},
    [Component.Table]: { variants: { default: {
      borderStyle: BORDER_STYLE.FULL,
      borderColor: '666666',
      borderWidth: 1,
      cellPadding: 0.1,
      cellTextStyle: TEXT_STYLE.BODY,
      headerTextStyle: TEXT_STYLE.BODY,
    }}},
    [Component.Line]: { variants: { default: {
      color: '666666',
      width: 1,
      dashType: DASH_TYPE.SOLID,
    }}},
    [Component.SlideNumber]: { variants: { default: {
      style: TEXT_STYLE.FOOTER,
      color: '666666',
      hAlign: HALIGN.RIGHT,
    }}},
    [Component.Text]: { variants: { default: {
      color: '000000',
      bulletColor: '000000',
      style: TEXT_STYLE.BODY,
      lineHeightMultiplier: 1.2,
    }}},
    [Component.Shape]: { variants: { default: {
      fill: '666666',
      fillOpacity: 100,
      borderColor: 'FFFFFF',
      borderWidth: 0,
      cornerRadius: 0,
    }}},
  },
  textStyles: {
    h1: { fontFamily: mockFontFamily, fontSize: 36, color: '000000' },
    h2: { fontFamily: mockFontFamily, fontSize: 28, color: '000000' },
    h3: { fontFamily: mockFontFamily, fontSize: 24, color: '000000' },
    h4: { fontFamily: mockFontFamily, fontSize: 20, color: '000000' },
    body: { fontFamily: mockFontFamily, fontSize: 18, color: '000000' },
    small: { fontFamily: mockFontFamily, fontSize: 14, color: '000000' },
    eyebrow: { fontFamily: mockFontFamily, fontSize: 12, color: '666666' },
    footer: { fontFamily: mockFontFamily, fontSize: 12, color: '666666' },
  },
  spacing: {
    unit: 0.125,
    margin: 0.5,
    gap: 0.25,
    gapTight: 0.125,
    gapLoose: 0.5,
    padding: 0.25,
    cellPadding: 0.1,
    bulletSpacing: 1.2,
    bulletIndentMultiplier: 1.5,
    maxScaleFactor: 2.0,
    lineSpacing: 1.2,
  },
  borders: {
    width: 1,
    radius: 0.1,
  },
  slide: {
    layout: 'LAYOUT_16x9',
    width: 10,
    height: 5.625,
  },
};

/** Expand ComponentNode tree to ElementNode tree, then generate layout HTML */
async function genHTML(node: any, bounds: Bounds, theme: Theme) {
  const expanded = await componentRegistry.expandTree(node, { theme }) as ElementNode;
  return generateLayoutHTML([{ tree: expanded, bounds }], theme);
}

describe('HTML Measurement Generation', () => {
  const bounds = new Bounds(0, 0, 10, 5);

  describe('LayoutContainer (unified Row/Column)', () => {
    test('row generates flex-direction: row', async () => {
      const node = row(label('A'), label('B'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex-direction:row'), 'Row should have flex-direction:row');
    });

    test('column generates flex-direction: column', async () => {
      const node = column(label('A'), label('B'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex-direction:column'), 'Column should have flex-direction:column');
    });

    test('row with hAlign center generates justify-content: center', async () => {
      const node = row({ hAlign: HALIGN.CENTER }, label('A'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('justify-content:center'), 'Row hAlign center should use justify-content:center');
    });

    test('row with hAlign right generates justify-content: flex-end', async () => {
      const node = row({ hAlign: HALIGN.RIGHT }, label('A'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('justify-content:flex-end'), 'Row hAlign right should use justify-content:flex-end');
    });

    test('row with padding generates padding style', async () => {
      const node = row({ padding: 0.5 }, label('A'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('padding:'), 'Row with padding should generate padding style');
    });

    test('column with padding generates padding style', async () => {
      const node = column({ padding: 0.5 }, label('A'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('padding:'), 'Column with padding should generate padding style');
    });
  });

  describe('Text rendering', () => {
    test('label generates width: 100%', async () => {
      const node = label('Hello world');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('width:100%'), 'Label should have width:100%');
    });

    test('label with hAlign center generates text-align: center', async () => {
      const node = label('Hello', { hAlign: HALIGN.CENTER });
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('text-align:center'), 'Label with hAlign center should use text-align:center');
    });

    test('label with hAlign right generates text-align: right', async () => {
      const node = label('Hello', { hAlign: HALIGN.RIGHT });
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('text-align:right'), 'Label with hAlign right should use text-align:right');
    });
  });

  describe('Bullet rendering', () => {
    test('bullet renders as native ul/li with disc markers', async () => {
      const node = prose('- Item');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('<ul'), 'Bullet should render as <ul>');
      assert.ok(html.includes('<li'), 'Bullet items should render as <li>');
      assert.ok(html.includes('list-style:disc'), 'Bullet list should use disc markers');
    });

    test('bullet list has padding for indent', async () => {
      const node = prose('- Item');
      const { html } = await genHTML(node, bounds, mockTheme);
      // ul uses padding shorthand: padding:0 0 0 Npx
      const ulMatch = html.match(/<ul[^>]*style="([^"]*)"/);
      assert.ok(ulMatch, 'Should find <ul> with style');
      assert.ok(ulMatch![1].includes('padding:0 0 0'), 'Bullet list should have left padding for indent');
    });

    test('multi-run bullet renders all runs in one li', async () => {
      // "- **Bold:** plain text" produces two runs: bold with bullet, plain without
      const node = prose('- **Bold:** plain text');
      const { html } = await genHTML(node, bounds, mockTheme);
      // The li should contain both the bold and plain spans
      const liMatch = html.match(/<li[^>]*>(.*?)<\/li>/);
      assert.ok(liMatch, 'Should have a <li> element');
      const liContent = liMatch![1];
      assert.ok(liContent.includes('Bold:'), 'li should contain bold text');
      assert.ok(liContent.includes('plain text'), 'li should contain plain text in same element');
    });
  });

  describe('Paragraph spacing', () => {
    test('breakLine generates margin-top spacing', async () => {
      const node = prose('Para 1\n\nPara 2');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('margin-top:1em'), 'breakLine should generate margin-top:1em for paragraph spacing');
    });

    test('breakLine does not generate br tag', async () => {
      const node = prose('Para 1\n\nPara 2');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(!html.includes('<br'), 'breakLine should not use <br> — uses margin-top instead');
    });
  });

  describe('Direction-aware flex item sizing', () => {
    test('row with explicit height in column uses flex: 0 0 (fixed main axis)', async () => {
      // This is the title-slide logo bug: row({ height: 0.33 }) inside a column
      // should NOT get flex: 1 1 0 which would override the explicit height
      const node = column(row({ height: 0.33 }, label('Logo')));
      const { html } = await genHTML(node, bounds, mockTheme);
      // 0.33 inches * 96 DPI = 31.68px
      assert.ok(html.includes('flex:0 0 31.68px'), 'Row with explicit height in column should get flex:0 0 <height>px');
    });

    test('column with explicit width in row uses flex: 0 0 (fixed main axis)', async () => {
      const node = row(column({ width: 3 }, label('Left')), label('Right'));
      const { html } = await genHTML(node, bounds, mockTheme);
      // 3 inches * 96 DPI = 288px
      assert.ok(html.includes('flex:0 0 288px'), 'Column with explicit width in row should get flex:0 0 <width>px');
    });

    test('row with default HUG height in column uses flex-shrink:0 (content-sized)', async () => {
      // Row defaults to height: HUG. In column parent, height is main axis.
      // HUG main axis → flex-shrink:0, no flex:1 1 0
      const node = column(row(label('A'), label('B')));
      const { html } = await genHTML(node, bounds, mockTheme);
      const rowDivMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(rowDivMatch, 'Should find the row div');
      assert.ok(!rowDivMatch![1].includes('flex:1 1 0'), 'Row with HUG height should NOT get flex:1 1 0');
      assert.ok(rowDivMatch![1].includes('flex-shrink:0'), 'Row with HUG height should get flex-shrink:0');
    });

    test('row with SIZE.FILL height in column fills available space', async () => {
      const node = column(row({ height: SIZE.FILL }, label('A')));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex:1 1 0'), 'Row with SIZE.FILL height should fill');
    });

    test('column with explicit height in column uses flex: 0 0 (cross-axis explicit)', async () => {
      // A column inside another column with fixed height
      const node = column(
        column({ height: 2 }, label('Fixed')),
        label('Below'),
      );
      const { html } = await genHTML(node, bounds, mockTheme);
      // 2 inches * 96 = 192px
      assert.ok(html.includes('flex:0 0 192px'), 'Nested column with explicit height should use flex:0 0');
    });

    test('row with explicit height also sets cross-axis height when in row parent', async () => {
      // A row inside another row - height is cross-axis, should use explicit height CSS
      const node = row(row({ height: 1 }, label('Inner')));
      const { html } = await genHTML(node, bounds, mockTheme);
      // height is cross-axis in a row parent, so should be explicit CSS height
      assert.ok(html.includes('height:96px'), 'Row with height in row parent should set explicit height CSS');
    });
  });

  describe('Image direction awareness', () => {
    test('image in column gets width: 100%', async () => {
      const node = column(image(testImage));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('width:100%'), 'Image in column should get width:100%');
    });

    test('image in row gets height: 100%', async () => {
      const node = row(image(testImage));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('height:100%'), 'Image in row should get height:100%');
    });
  });

  describe('Line direction awareness', () => {
    test('line in column gets width: 100% (horizontal separator)', async () => {
      const node = column(label('Above'), line(), label('Below'));
      const { html } = await genHTML(node, bounds, mockTheme);
      // Line in column = horizontal separator
      assert.ok(html.includes('width:100%'), 'Line in column should be full-width horizontal separator');
    });

    test('line in row gets align-self: stretch (vertical separator)', async () => {
      const node = row(label('Left'), line(), label('Right'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('align-self:stretch'), 'Line in row should stretch vertically');
    });
  });

  describe('Vertical alignment (safe overflow protection)', () => {
    test('column with vAlign MIDDLE generates safe center', async () => {
      const node = column({ vAlign: VALIGN.MIDDLE }, label('Centered'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('safe center'), 'vAlign MIDDLE should use "safe center" — prevents content above parent in measurements');
    });

    test('column with vAlign BOTTOM generates safe flex-end', async () => {
      const node = column({ vAlign: VALIGN.BOTTOM }, label('Bottom'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('safe flex-end'), 'vAlign BOTTOM should use "safe flex-end"');
    });

    test('column with vAlign TOP (default) generates flex-start (no safe needed)', async () => {
      const node = column(label('Top'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('justify-content:flex-start'), 'vAlign TOP should use plain flex-start');
    });
  });

  describe('Cross-axis stretch (containers fill parent height in rows)', () => {
    test('row defaults to align-items: stretch (vAlign: TOP)', async () => {
      // Row defaults to VALIGN.TOP → align-items: stretch.
      // Children fill row height natively — no explicit height: 100% needed.
      const node = row(column(text('Card content')));
      const { html } = await genHTML(node, bounds, mockTheme);
      const rowMatch = html.match(/data-node-id="node-1"[^>]*style="([^"]*)"/);
      assert.ok(rowMatch, 'Should find the row div');
      assert.ok(rowMatch![1].includes('align-items:stretch'), 'Row should default to align-items:stretch');
    });

    test('row with vAlign MIDDLE uses align-items: center', async () => {
      const node = row({ vAlign: VALIGN.MIDDLE }, column(text('Nested')));
      const { html } = await genHTML(node, bounds, mockTheme);
      const rowMatch = html.match(/data-node-id="node-1"[^>]*style="([^"]*)"/);
      assert.ok(rowMatch, 'Should find the row div');
      assert.ok(rowMatch![1].includes('align-items:center'), 'Row with vAlign MIDDLE should use center');
    });

    test('container in row: FILL width (main axis) gets flex:1 1 0 and min-width:0', async () => {
      // Column in row: width=FILL (main axis) → flex:1 1 0, minWidth:0
      // height=HUG (cross axis) → omit (stretch handles it)
      const node = row(column(text('A')));
      const { html } = await genHTML(node, bounds, mockTheme);
      const columnMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the nested column div');
      assert.ok(columnMatch![1].includes('flex:1 1 0'), 'Column in row should get flex:1 1 0 (FILL main axis)');
      assert.ok(columnMatch![1].includes('min-width:0'), 'Column in row should have min-width:0 (FILL main axis)');
    });

    test('stack grid uses minmax(min-content, 1fr) to prevent content collapse', async () => {
      // Grid tracks must be at least content-sized to prevent children from collapsing to zero height
      const node = column(stack(shape({ shape: SHAPE.ROUND_RECT }), column(text('Content'))));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('minmax(min-content, 1fr)'), 'Stack grid should use minmax(min-content, 1fr)');
    });

    test('container in row omits height (stretch handles cross-axis fill)', async () => {
      // align-items: stretch on the row makes children fill the row height natively.
      // No explicit height: 100% needed — CSS stretch does the work.
      const node = row(column(text('A')), column(text('B')));
      const { html } = await genHTML(node, bounds, mockTheme);
      const columnMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the nested column div');
      assert.ok(!columnMatch![1].includes('height:100%'), 'Column in row should not have height:100% (stretch handles it)');
    });

    test('stack in row omits height (stretch handles card equal height)', async () => {
      // Stacks (used by card component) in rows rely on align-items: stretch for equal height.
      const node = row(stack(shape({ shape: SHAPE.ROUND_RECT }), column(text('Card'))));
      const { html } = await genHTML(node, bounds, mockTheme);
      const stackMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(stackMatch, 'Should find the stack div');
      assert.ok(!stackMatch![1].includes('height:100%'), 'Stack in row should not have height:100% (stretch handles it)');
    });

    test('stack child (grid item) is flex container filling the grid cell', async () => {
      // Grid items inside stack must be flex containers so children fill the grid cell.
      // Compression is handled by LayoutStack's grid template (heightIsConstrained),
      // not by min-height/overflow on the grid item wrapper.
      const node = column(stack(shape({ shape: SHAPE.ROUND_RECT }), column(text('Content'))));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('grid-area:1 / 1 / 2 / 2;display:flex;flex-direction:column'), 'Stack child should be flex container');
      assert.ok(!html.includes('overflow:hidden'), 'Stack child should NOT have overflow:hidden (compression is in grid template)');
    });

    test('column with SIZE.FILL inside stack gets flex:1 1 0 (fills stack for centering)', async () => {
      // Components like quote() explicitly set height: SIZE.FILL on their content column
      // so that vAlign: MIDDLE centering works when the stack has definite height.
      // Node IDs: stack=node-1, shape=node-2, column=node-3, text=node-4
      const node = stack(shape({ shape: SHAPE.ROUND_RECT }), column({ vAlign: VALIGN.MIDDLE, height: SIZE.FILL }, text('Centered')));
      const { html } = await genHTML(node, bounds, mockTheme);
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
      const node = stack(shape({ shape: SHAPE.ROUND_RECT }), column({ vAlign: VALIGN.MIDDLE }, text('Content')));
      const { html } = await genHTML(node, bounds, mockTheme);
      const columnMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the column inside stack (node-3)');
      assert.ok(!columnMatch![1].includes('flex:1 1 0'), 'Column without SIZE.FILL should NOT get flex:1 1 0');
    });
  });

  describe('Compressibility rules', () => {
    test('image in constrained column is compressible (flex: 1 1 0, min-height: 0)', async () => {
      const node = column({ height: SIZE.FILL }, image(testImage));
      const { html } = await genHTML(node, bounds, mockTheme);
      const imageMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      // Image in constrained column: grows to fill and can compress (min-height:0)
      assert.ok(imageMatch![1].includes('flex:1 1 0'), 'Image in constrained column should grow to fill (flex:1 1 0)');
      assert.ok(imageMatch![1].includes('min-height:0'), 'Image in constrained column should be compressible (min-height:0)');
    });

    test('image in auto-height row shares width equally (flex: 1 1 0)', async () => {
      // Row with no explicit height: image has no height anchor for aspect-ratio,
      // so it must share space equally with siblings
      const node = row(image(testImage), text('Description'));
      const { html } = await genHTML(node, bounds, mockTheme);
      const imageMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      assert.ok(imageMatch![1].includes('flex:1 1 0'), 'Image in auto-height row should share width (flex:1 1 0)');
      assert.ok(imageMatch![1].includes('min-width:0px'), 'Image in auto-height row should have min-width:0px');
    });

    test('image in definite-height row uses natural aspect-ratio width (flex: 0 1 auto)', async () => {
      // Row with explicit height: height: 100% resolves, aspect-ratio derives width.
      // Image should NOT grow to fill — it should be naturally sized.
      const node = row({ height: 0.33 }, image(testImage));
      const { html } = await genHTML(node, bounds, mockTheme);
      const imageMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      assert.ok(imageMatch![1].includes('flex:0 1 auto'), 'Image in definite-height row should use natural width (flex:0 1 auto)');
      assert.ok(!imageMatch![1].includes('flex:1 1 0'), 'Image in definite-height row should NOT grow to fill');
    });

    test('image in SIZE.FILL row uses natural aspect-ratio width (flex: 0 1 auto)', async () => {
      // Row with SIZE.FILL height: also definite (resolves via flex: 1 1 0 on the row itself)
      const node = column(row({ height: SIZE.FILL }, image(testImage)));
      const { html } = await genHTML(node, bounds, mockTheme);
      const imageMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      assert.ok(imageMatch![1].includes('flex:0 1 auto'), 'Image in SIZE.FILL row should use natural width (flex:0 1 auto)');
    });

    test('text in column is incompressible (width: 100%, flex-shrink: 0)', async () => {
      const node = column(text('Do not compress me'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex-shrink:0'), 'Text in column should have flex-shrink:0 (incompressible height)');
      assert.ok(html.includes('width:100%'), 'Text in column should have width:100%');
    });

    test('text in row shares width (flex: 1 1 0, min-width: 0)', async () => {
      const node = row(image(testImage), text('Description beside image'));
      const { html } = await genHTML(node, bounds, mockTheme);
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
      const node = column(row(text('A'), text('B')));
      const { html } = await genHTML(node, bounds, mockTheme);
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
      const node = column({ height: SIZE.FILL },
        column({ height: SIZE.FILL },
          column({ height: SIZE.FILL }, image(testImage)),
        ),
      );
      const { html } = await genHTML(node, bounds, mockTheme);
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
      const node = column(
        column({ height: 2 },
          column({ height: SIZE.FILL }, image('./test/fixtures/test.png')),
        ),
      );
      const { html } = await genHTML(node, bounds, mockTheme);
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
      const node = column({ height: SIZE.FILL },
        stack({ height: SIZE.FILL }, shape({ shape: SHAPE.ROUND_RECT }), column(text('Content'))),
      );
      const { html } = await genHTML(node, bounds, mockTheme);
      const stackMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(stackMatch, 'Should find the stack (node-2)');
      assert.ok(stackMatch![1].includes('min-content'), 'Stack should use min-content grid template (preserves padding)');
      assert.ok(!stackMatch![1].includes('minmax(0'), 'Stack should NOT use minmax(0, ...) (would allow crushing content)');
    });

    test('row passes constraint through to images in nested columns', async () => {
      // Slide root (constrained) → FILL column → FILL row → FILL column → image
      // The row passes through the constraint, so the image gets min-height:0.
      // node-1: outer column, node-2: row, node-3: column, node-4: image
      const node = column({ height: SIZE.FILL },
        row({ height: SIZE.FILL },
          column({ height: SIZE.FILL }, image('./test/fixtures/test.png')),
        ),
      );
      const { html } = await genHTML(node, bounds, mockTheme);
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
      const node = column({ height: SIZE.FILL },
        row(
          column({ height: SIZE.FILL }, text('inside HUG row')),
        ),
      );
      const { html } = await genHTML(node, bounds, mockTheme);
      const innerCol = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(innerCol, 'Should find inner column (node-3)');
      assert.ok(innerCol![1].includes('flex:1 1 0'), 'Inner column should be FILL');
      assert.ok(!innerCol![1].includes('min-height:0'), 'HUG row should break chain — inner column should NOT get min-height:0');
    });

    test('image in constrained column gets min-height:0 through row', async () => {
      // Slide root (constrained) → FILL column → FILL row → FILL column → image
      // The row passes constraint through, so the image in the inner column gets min-height:0.
      // node-1: outer column, node-2: row, node-3: inner column, node-4: image
      const node = column({ height: SIZE.FILL },
        row({ height: SIZE.FILL },
          column({ height: SIZE.FILL }, image(testImage)),
        ),
      );
      const { html } = await genHTML(node, bounds, mockTheme);
      const imgMatch = html.match(/data-node-id="node-4"[^>]*style="([^"]*)"/);
      assert.ok(imgMatch, 'Should find image (node-4)');
      assert.ok(imgMatch![1].includes('min-height:0'), 'Image in column inside constrained row should get min-height:0');
    });
  });
});
