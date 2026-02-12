// HTML Measurement Tests
// Tests for HTML generation used in browser-based text measurement

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { generateLayoutHTML } from '../dist/layout/layoutHtml.js';
import { text, row, column, image, line, stack, shape } from '../dist/dsl/index.js';
import { componentRegistry } from '../dist/core/registry.js';
import { Bounds } from '../dist/core/bounds.js';
import { HALIGN, VALIGN, DIRECTION, SIZE, SHAPE } from '../dist/core/types.js';
import type { Theme, } from '../dist/core/types.js';
import type { ElementNode } from '../dist/core/nodes.js';
import { NODE_TYPE } from '../dist/core/nodes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal theme for testing - matches Theme interface from types.ts
const mockFont = { name: 'Arial', path: path.join(__dirname, 'fixtures', 'test-font.woff2') };
const mockFontFamily = { normal: mockFont };

const mockTheme: Theme = {
  colors: {
    primary: '000000',
    background: 'FFFFFF',
    secondary: '666666',
    accent1: '0066CC',
    accent2: '00CC66',
    accent3: 'CC6600',
    accent4: '6600CC',
    accent5: 'CC0066',
    text: '000000',
    textMuted: '666666',
    subtleOpacity: 20,
  },
  highlights: {
    code: { bg: 'F5F5F5', text: '333333' },
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
  return generateLayoutHTML(expanded, bounds, theme);
}

describe('HTML Measurement Generation', () => {
  const bounds = new Bounds(0, 0, 10, 5);

  describe('LayoutContainer (unified Row/Column)', () => {
    test('row generates flex-direction: row', async () => {
      const node = row(text('A'), text('B'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex-direction:row'), 'Row should have flex-direction:row');
    });

    test('column generates flex-direction: column', async () => {
      const node = column(text('A'), text('B'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex-direction:column'), 'Column should have flex-direction:column');
    });

    test('row with hAlign center generates justify-content: center', async () => {
      const node = row({ hAlign: HALIGN.CENTER }, text('A'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('justify-content:center'), 'Row hAlign center should use justify-content:center');
    });

    test('row with hAlign right generates justify-content: flex-end', async () => {
      const node = row({ hAlign: HALIGN.RIGHT }, text('A'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('justify-content:flex-end'), 'Row hAlign right should use justify-content:flex-end');
    });

    test('row with padding generates padding style', async () => {
      const node = row({ padding: 0.5 }, text('A'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('padding:'), 'Row with padding should generate padding style');
    });

    test('column with padding generates padding style', async () => {
      const node = column({ padding: 0.5 }, text('A'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('padding:'), 'Column with padding should generate padding style');
    });
  });

  describe('Text rendering', () => {
    test('text generates width: 100%', async () => {
      const node = text('Hello world');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('width:100%'), 'Text should have width:100%');
    });

    test('text with hAlign center generates text-align: center', async () => {
      const node = text('Hello', { hAlign: HALIGN.CENTER });
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('text-align:center'), 'Text with hAlign center should use text-align:center');
    });

    test('text with hAlign right generates text-align: right', async () => {
      const node = text('Hello', { hAlign: HALIGN.RIGHT });
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('text-align:right'), 'Text with hAlign right should use text-align:right');
    });
  });

  describe('Bullet rendering', () => {
    test('bullet text generates padding-left', async () => {
      const node = text('- Item');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('padding-left:'), 'Bullet should have padding-left');
    });

    test('bullet includes bullet character', async () => {
      const node = text('- Item');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('•'), 'Bullet should include bullet character');
    });
  });

  describe('Paragraph spacing', () => {
    test('breakLine generates block spacer div with height: 1em', async () => {
      const node = text('Para 1\n\nPara 2');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('height:1em'), 'breakLine should generate a spacer div with height:1em');
    });

    test('breakLine does not generate br tag', async () => {
      const node = text('Para 1\n\nPara 2');
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(!html.includes('<br'), 'breakLine should not use <br> — uses block spacer instead');
    });
  });

  describe('Direction-aware flex item sizing', () => {
    test('row with explicit height in column uses flex: 0 0 (fixed main axis)', async () => {
      // This is the title-slide logo bug: row({ height: 0.33 }) inside a column
      // should NOT get flex: 1 1 0 which would override the explicit height
      const node = column(row({ height: 0.33 }, text('Logo')));
      const { html } = await genHTML(node, bounds, mockTheme);
      // 0.33 inches * 96 DPI = 31.68px
      assert.ok(html.includes('flex:0 0 31.68px'), 'Row with explicit height in column should get flex:0 0 <height>px');
    });

    test('column with explicit width in row uses flex: 0 0 (fixed main axis)', async () => {
      const node = row(column({ width: 3 }, text('Left')), text('Right'));
      const { html } = await genHTML(node, bounds, mockTheme);
      // 3 inches * 96 DPI = 288px
      assert.ok(html.includes('flex:0 0 288px'), 'Column with explicit width in row should get flex:0 0 <width>px');
    });

    test('row with no height in column uses intrinsic height (no flex grow)', async () => {
      // In a column, children default to intrinsic height (content-determined)
      // Only SIZE.FILL triggers flex: 1 1 0
      const node = column(row(text('A'), text('B')));
      const { html } = await genHTML(node, bounds, mockTheme);
      // The row inside the column should NOT get flex: 1 1 0
      // (The outer column gets it via .root > * CSS, but the row itself should be intrinsic)
      // We check the row doesn't have flex: 1 1 0 by checking it doesn't appear
      // in the row's div (after the column's div which does get it from .root > *)
      // Note: the column's flex comes from .root > * CSS rule, not inline styles
      const rowDivMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(rowDivMatch, 'Should find the row div');
      assert.ok(!rowDivMatch![1].includes('flex:1 1 0'), 'Row in column should NOT get flex:1 1 0 by default');
    });

    test('row with SIZE.FILL height in column fills available space', async () => {
      const node = column(row({ height: SIZE.FILL }, text('A')));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex:1 1 0'), 'Row with SIZE.FILL height should fill');
    });

    test('column with explicit height in column uses flex: 0 0 (cross-axis explicit)', async () => {
      // A column inside another column with fixed height
      const node = column(
        column({ height: 2 }, text('Fixed')),
        text('Below'),
      );
      const { html } = await genHTML(node, bounds, mockTheme);
      // 2 inches * 96 = 192px
      assert.ok(html.includes('flex:0 0 192px'), 'Nested column with explicit height should use flex:0 0');
    });

    test('row with explicit height also sets cross-axis height when in row parent', async () => {
      // A row inside another row - height is cross-axis, should use explicit height CSS
      const node = row(row({ height: 1 }, text('Inner')));
      const { html } = await genHTML(node, bounds, mockTheme);
      // height is cross-axis in a row parent, so should be explicit CSS height
      assert.ok(html.includes('height:96px'), 'Row with height in row parent should set explicit height CSS');
    });
  });

  describe('Image direction awareness', () => {
    test('image in column gets width: 100%', async () => {
      const node = column(image('./test/fixtures/test.png'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('width:100%'), 'Image in column should get width:100%');
    });

    test('image in row gets height: 100%', async () => {
      const node = row(image('./test/fixtures/test.png'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('height:100%'), 'Image in row should get height:100%');
    });
  });

  describe('Line direction awareness', () => {
    test('line in column gets width: 100% (horizontal separator)', async () => {
      const node = column(text('Above'), line(), text('Below'));
      const { html } = await genHTML(node, bounds, mockTheme);
      // Line in column = horizontal separator
      assert.ok(html.includes('width:100%'), 'Line in column should be full-width horizontal separator');
    });

    test('line in row gets align-self: stretch (vertical separator)', async () => {
      const node = row(text('Left'), line(), text('Right'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('align-self:stretch'), 'Line in row should stretch vertically');
    });
  });

  describe('Safe vertical alignment (overflow protection)', () => {
    test('column with vAlign MIDDLE generates safe center', async () => {
      const node = column({ vAlign: VALIGN.MIDDLE }, text('Centered'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('safe center'), 'vAlign MIDDLE should use "safe center" to prevent content above parent');
    });

    test('column with vAlign BOTTOM generates safe flex-end', async () => {
      const node = column({ vAlign: VALIGN.BOTTOM }, text('Bottom'));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('safe flex-end'), 'vAlign BOTTOM should use "safe flex-end"');
    });

    test('column with vAlign TOP (default) generates flex-start (no safe needed)', async () => {
      const node = column(text('Top'));
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

    test('container in row has min-height: 0 (allows vertical compression)', async () => {
      // Containers in rows need min-height: 0 so they can compress vertically
      // when constrained by align-items: stretch
      const node = row(column(text('A')));
      const { html } = await genHTML(node, bounds, mockTheme);
      const columnMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the nested column div');
      assert.ok(columnMatch![1].includes('min-height:0px'), 'Column in row should have min-height:0px');
    });

    test('stack grid uses minmax(0, 1fr) to allow track shrinking', async () => {
      // Grid tracks must allow shrinking below content size
      const node = column(stack(shape({ shape: SHAPE.ROUND_RECT }), column(text('Content'))));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('minmax(0, 1fr)'), 'Stack grid should use minmax(0, 1fr) not plain 1fr');
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

    test('stack child (grid item) is flex container with min-height: 0 and overflow: hidden', async () => {
      // Grid items inside stack must be flex containers so children fill the grid cell.
      // This works because the height chain is definite: SIZE.FILL → stretch → grid → here.
      const node = column(stack(shape({ shape: SHAPE.ROUND_RECT }), column(text('Content'))));
      const { html } = await genHTML(node, bounds, mockTheme);
      assert.ok(html.includes('grid-area:1 / 1 / 2 / 2;display:flex;flex-direction:column;min-height:0px;overflow:hidden'), 'Stack child should be flex container with min-height:0px and overflow:hidden');
    });
  });

  describe('Compressibility rules', () => {
    test('image in column is compressible (flex-shrink: 1, min-height: 0)', async () => {
      const node = column(image('./test/fixtures/test.png'));
      const { html } = await genHTML(node, bounds, mockTheme);
      // Image should be able to shrink to fit available space
      assert.ok(html.includes('flex:0 1 auto'), 'Image should have flex-shrink: 1 (compressible)');
      assert.ok(html.includes('min-height:0px'), 'Image in column should have min-height:0px');
    });

    test('image in auto-height row shares width equally (flex: 1 1 0)', async () => {
      // Row with no explicit height: image has no height anchor for aspect-ratio,
      // so it must share space equally with siblings
      const node = row(image('./test/fixtures/test.png'), text('Description'));
      const { html } = await genHTML(node, bounds, mockTheme);
      const imageMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      assert.ok(imageMatch![1].includes('flex:1 1 0'), 'Image in auto-height row should share width (flex:1 1 0)');
      assert.ok(imageMatch![1].includes('min-width:0px'), 'Image in auto-height row should have min-width:0px');
    });

    test('image in definite-height row uses natural aspect-ratio width (flex: 0 1 auto)', async () => {
      // Row with explicit height: height: 100% resolves, aspect-ratio derives width.
      // Image should NOT grow to fill — it should be naturally sized.
      const node = row({ height: 0.33 }, image('./test/fixtures/test.png'));
      const { html } = await genHTML(node, bounds, mockTheme);
      const imageMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(imageMatch, 'Should find the image div');
      assert.ok(imageMatch![1].includes('flex:0 1 auto'), 'Image in definite-height row should use natural width (flex:0 1 auto)');
      assert.ok(!imageMatch![1].includes('flex:1 1 0'), 'Image in definite-height row should NOT grow to fill');
    });

    test('image in SIZE.FILL row uses natural aspect-ratio width (flex: 0 1 auto)', async () => {
      // Row with SIZE.FILL height: also definite (resolves via flex: 1 1 0 on the row itself)
      const node = column(row({ height: SIZE.FILL }, image('./test/fixtures/test.png')));
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
      const node = row(image('./test/fixtures/test.png'), text('Description beside image'));
      const { html } = await genHTML(node, bounds, mockTheme);
      // Text in a row should share width, not claim 100%
      const textMatch = html.match(/data-node-id="node-3"[^>]*style="([^"]*)"/);
      assert.ok(textMatch, 'Should find the text div');
      assert.ok(textMatch![1].includes('flex:1 1 0'), 'Text in row should use flex:1 1 0 to share width');
      assert.ok(textMatch![1].includes('min-width:0px'), 'Text in row should have min-width:0px to allow shrinking');
      assert.ok(!textMatch![1].includes('width:100%'), 'Text in row should NOT have width:100%');
    });

    test('container in column has min-height: 0 (allows compression)', async () => {
      // A row inside a column should be able to compress when parent is constrained
      const node = column(row(text('A'), text('B')));
      const { html } = await genHTML(node, bounds, mockTheme);
      const rowDivMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(rowDivMatch, 'Should find the row div');
      assert.ok(rowDivMatch![1].includes('min-height:0px'), 'Row in column should have min-height:0px for compression');
    });
  });
});
