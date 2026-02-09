// HTML Measurement Tests
// Tests for HTML generation used in browser-based text measurement

import { describe, test, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import { generateLayoutHTML, resetIdCounter } from '../dist/layout/html-measurement.js';
import { text, row, column } from '../src/core/dsl.js';
import { Bounds } from '../src/core/bounds.js';
import { HALIGN, VALIGN, DIRECTION } from '../src/core/types.js';
import type { Theme } from '../src/core/types.js';

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

  beforeEach(() => {
    resetIdCounter();
  });

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
});
