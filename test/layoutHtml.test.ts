// HTML Measurement Tests
// Tests for HTML generation used in browser-based text measurement

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { generateLayoutHTML } from '../dist/layout/layoutHtml.js';
import { text, row, column, image, line, stack, rectangle } from '../dist/core/dsl.js';
import { Bounds } from '../dist/core/bounds.js';
import { HALIGN, VALIGN, DIRECTION, SIZE } from '../dist/core/types.js';
import type { Theme } from '../dist/core/types.js';
import { NODE_TYPE } from '../dist/core/nodes.js';

// Minimal theme for testing - matches Theme interface from types.ts
const mockFont = { name: 'Arial', path: '/fonts/Arial.ttf' };
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

describe('HTML Measurement Generation', () => {
  const bounds = new Bounds(0, 0, 10, 5);

  describe('LayoutContainer (unified Row/Column)', () => {
    test('row generates flex-direction: row', () => {
      const node = row(text('A'), text('B'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex-direction: row'), 'Row should have flex-direction: row');
    });

    test('column generates flex-direction: column', () => {
      const node = column(text('A'), text('B'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex-direction: column'), 'Column should have flex-direction: column');
    });

    test('row with hAlign center generates justify-content: center', () => {
      const node = row({ hAlign: HALIGN.CENTER }, text('A'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('justify-content: center'), 'Row hAlign center should use justify-content: center');
    });

    test('row with hAlign right generates justify-content: flex-end', () => {
      const node = row({ hAlign: HALIGN.RIGHT }, text('A'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('justify-content: flex-end'), 'Row hAlign right should use justify-content: flex-end');
    });

    test('row with padding generates padding style', () => {
      const node = row({ padding: 0.5 }, text('A'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('padding:'), 'Row with padding should generate padding style');
    });

    test('column with padding generates padding style', () => {
      const node = column({ padding: 0.5 }, text('A'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('padding:'), 'Column with padding should generate padding style');
    });
  });

  describe('Text rendering', () => {
    test('text generates width: 100%', () => {
      const node = text('Hello world');
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('width: 100%'), 'Text should have width: 100%');
    });

    test('text with hAlign center generates text-align: center', () => {
      const node = text('Hello', { hAlign: HALIGN.CENTER });
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('text-align: center'), 'Text with hAlign center should use text-align: center');
    });

    test('text with hAlign right generates text-align: right', () => {
      const node = text('Hello', { hAlign: HALIGN.RIGHT });
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('text-align: right'), 'Text with hAlign right should use text-align: right');
    });
  });

  describe('Bullet rendering', () => {
    test('bullet text generates padding-left', () => {
      const node = text([{ text: 'Item', bullet: true }]);
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('padding-left:'), 'Bullet should have padding-left');
    });

    test('bullet includes bullet character', () => {
      const node = text([{ text: 'Item', bullet: true }]);
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('•'), 'Bullet should include bullet character');
    });
  });

  describe('Paragraph spacing', () => {
    test('paraSpaceBefore generates margin-top', () => {
      const node = text([{ text: 'Paragraph', paraSpaceBefore: 12 }]);
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('margin-top:'), 'paraSpaceBefore should generate margin-top');
    });

    test('paraSpaceAfter generates margin-bottom', () => {
      const node = text([{ text: 'Paragraph', paraSpaceAfter: 12 }]);
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('margin-bottom:'), 'paraSpaceAfter should generate margin-bottom');
    });
  });

  describe('Direction-aware flex item sizing', () => {
    test('row with explicit height in column uses flex: 0 0 (fixed main axis)', () => {
      // This is the title-slide logo bug: row({ height: 0.33 }) inside a column
      // should NOT get flex: 1 1 0 which would override the explicit height
      const node = column(row({ height: 0.33 }, text('Logo')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      // 0.33 inches * 96 DPI = 31.68px
      assert.ok(html.includes('flex: 0 0 31.68px'), 'Row with explicit height in column should get flex: 0 0 <height>px');
    });

    test('column with explicit width in row uses flex: 0 0 (fixed main axis)', () => {
      const node = row(column({ width: 3 }, text('Left')), text('Right'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      // 3 inches * 96 DPI = 288px
      assert.ok(html.includes('flex: 0 0 288px'), 'Column with explicit width in row should get flex: 0 0 <width>px');
    });

    test('row with no height in column uses intrinsic height (no flex grow)', () => {
      // In a column, children default to intrinsic height (content-determined)
      // Only SIZE.FILL triggers flex: 1 1 0
      const node = column(row(text('A'), text('B')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      // The row inside the column should NOT get flex: 1 1 0
      // (The outer column gets it via .root > * CSS, but the row itself should be intrinsic)
      // We check the row doesn't have flex: 1 1 0 by checking it doesn't appear
      // in the row's div (after the column's div which does get it from .root > *)
      // Note: the column's flex comes from .root > * CSS rule, not inline styles
      const rowDivMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(rowDivMatch, 'Should find the row div');
      assert.ok(!rowDivMatch![1].includes('flex: 1 1 0'), 'Row in column should NOT get flex: 1 1 0 by default');
    });

    test('row with SIZE.FILL height in column fills available space', () => {
      const node = column(row({ height: SIZE.FILL }, text('A')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex: 1 1 0'), 'Row with SIZE.FILL height should fill');
    });

    test('column with explicit height in column uses flex: 0 0 (cross-axis explicit)', () => {
      // A column inside another column with fixed height
      const node = column(
        column({ height: 2 }, text('Fixed')),
        text('Below'),
      );
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      // 2 inches * 96 = 192px
      assert.ok(html.includes('flex: 0 0 192px'), 'Nested column with explicit height should use flex: 0 0');
    });

    test('row with explicit height also sets cross-axis height when in row parent', () => {
      // A row inside another row - height is cross-axis, should use explicit height CSS
      const node = row(row({ height: 1 }, text('Inner')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      // height is cross-axis in a row parent, so should be explicit CSS height
      assert.ok(html.includes('height: 96px'), 'Row with height in row parent should set explicit height CSS');
    });
  });

  describe('Image direction awareness', () => {
    test('image in column gets width: 100%', () => {
      const node = column(image('./test/fixtures/test.png'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('width: 100%'), 'Image in column should get width: 100%');
    });

    test('image in row gets height: 100%', () => {
      const node = row(image('./test/fixtures/test.png'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('height: 100%'), 'Image in row should get height: 100%');
    });
  });

  describe('Line direction awareness', () => {
    test('line in column gets width: 100% (horizontal separator)', () => {
      const node = column(text('Above'), line(), text('Below'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      // Line in column = horizontal separator
      assert.ok(html.includes('width: 100%'), 'Line in column should be full-width horizontal separator');
    });

    test('line in row gets align-self: stretch (vertical separator)', () => {
      const node = row(text('Left'), line(), text('Right'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('align-self: stretch'), 'Line in row should stretch vertically');
    });
  });

  describe('Safe vertical alignment (overflow protection)', () => {
    test('column with vAlign MIDDLE generates safe center', () => {
      const node = column({ vAlign: VALIGN.MIDDLE }, text('Centered'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('safe center'), 'vAlign MIDDLE should use "safe center" to prevent content above parent');
    });

    test('column with vAlign BOTTOM generates safe flex-end', () => {
      const node = column({ vAlign: VALIGN.BOTTOM }, text('Bottom'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('safe flex-end'), 'vAlign BOTTOM should use "safe flex-end"');
    });

    test('column with vAlign TOP (default) generates flex-start (no safe needed)', () => {
      const node = column(text('Top'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('justify-content: flex-start'), 'vAlign TOP should use plain flex-start');
    });
  });

  describe('Cross-axis stretch (containers fill parent height in rows)', () => {
    test('row defaults to align-items: flex-start (vAlign: TOP)', () => {
      // Row defaults to VALIGN.TOP → align-items: flex-start.
      // Card layouts use SIZE.FILL on children for equal height instead of CSS stretch.
      const node = row(column(text('Card content')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      // Find the row element's style (first data-node-id)
      const rowMatch = html.match(/data-node-id="node-1"[^>]*style="([^"]*)"/);
      assert.ok(rowMatch, 'Should find the row div');
      assert.ok(rowMatch![1].includes('align-items: flex-start'), 'Row should default to align-items: flex-start');
    });

    test('row with vAlign MIDDLE uses align-items: center', () => {
      const node = row({ vAlign: VALIGN.MIDDLE }, column(text('Nested')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      const rowMatch = html.match(/data-node-id="node-1"[^>]*style="([^"]*)"/);
      assert.ok(rowMatch, 'Should find the row div');
      assert.ok(rowMatch![1].includes('align-items: center'), 'Row with vAlign MIDDLE should use center');
    });

    test('container in row has min-height: 0 (allows vertical compression)', () => {
      // Containers in rows need min-height: 0 so they can compress vertically
      // when constrained by align-items: stretch
      const node = row(column(text('A')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      const columnMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the nested column div');
      assert.ok(columnMatch![1].includes('min-height: 0'), 'Column in row should have min-height: 0');
    });

    test('stack grid uses minmax(0, 1fr) to allow track shrinking', () => {
      // Grid tracks must allow shrinking below content size
      const node = column(stack(rectangle(), column(text('Content'))));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('minmax(0, 1fr)'), 'Stack grid should use minmax(0, 1fr) not plain 1fr');
    });

    test('container in row gets height: 100% (cross-axis fill)', () => {
      // Containers in rows default to height: 100% so they match the tallest sibling.
      // This is the key behavior that makes row(card(), card(), card()) work —
      // all cards stretch to equal height without explicit SIZE.FILL.
      const node = row(column(text('A')), column(text('B')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      const columnMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(columnMatch, 'Should find the nested column div');
      assert.ok(columnMatch![1].includes('height: 100%'), 'Column in row should get height: 100% (cross-axis fill)');
    });

    test('stack in row gets height: 100% (card equal height)', () => {
      // Stacks (used by card component) in rows need height: 100% to match siblings.
      const node = row(stack(rectangle(), column(text('Card'))));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      const stackMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(stackMatch, 'Should find the stack div');
      assert.ok(stackMatch![1].includes('height: 100%'), 'Stack in row should get height: 100%');
    });

    test('stack child (grid item) is flex container with min-height: 0 and overflow: hidden', () => {
      // Grid items inside stack must be flex containers so children fill the grid cell.
      // This works because the height chain is definite: SIZE.FILL → stretch → grid → here.
      const node = column(stack(rectangle(), column(text('Content'))));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('grid-area: 1 / 1 / 2 / 2; display: flex; flex-direction: column; min-height: 0; overflow: hidden'), 'Stack child should be flex container with min-height: 0 and overflow: hidden');
    });
  });

  describe('Compressibility rules', () => {
    test('image in column is compressible (flex-shrink: 1, min-height: 0)', () => {
      const node = column(image('./test/fixtures/test.png'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      // Image should be able to shrink to fit available space
      assert.ok(html.includes('flex: 0 1 auto'), 'Image should have flex-shrink: 1 (compressible)');
      assert.ok(html.includes('min-height: 0'), 'Image in column should have min-height: 0');
    });

    test('image in row is compressible (flex-shrink: 1, min-width: 0)', () => {
      const node = row(image('./test/fixtures/test.png'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex: 0 1 auto'), 'Image should have flex-shrink: 1 (compressible)');
      assert.ok(html.includes('min-width: 0'), 'Image in row should have min-width: 0');
    });

    test('text is incompressible (flex-shrink: 0)', () => {
      const node = column(text('Do not compress me'));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      assert.ok(html.includes('flex-shrink: 0'), 'Text should have flex-shrink: 0 (incompressible)');
    });

    test('container in column has min-height: 0 (allows compression)', () => {
      // A row inside a column should be able to compress when parent is constrained
      const node = column(row(text('A'), text('B')));
      const { html } = generateLayoutHTML(node, bounds, mockTheme);
      const rowDivMatch = html.match(/data-node-id="node-2"[^>]*style="([^"]*)"/);
      assert.ok(rowDivMatch, 'Should find the row div');
      assert.ok(rowDivMatch![1].includes('min-height: 0'), 'Row in column should have min-height: 0 for compression');
    });
  });
});
