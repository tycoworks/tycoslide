// Measurement Collection
// Traverses node tree to collect text measurement requests

import type { ElementNode, TextNode, ListNode, CardNode, TableNode } from './nodes.js';
import type { Theme, TextStyleName, TextContent, TextStyle } from './types.js';
import { Bounds } from './bounds.js';
import { TEXT_STYLE, GAP } from './types.js';

// ============================================
// MEASUREMENT REQUEST TYPES
// ============================================

export interface TextMeasurementRequest {
  id: string;
  content: TextContent;
  style: TextStyle;
  availableWidth: number;
}

export interface StyleMeasurementRequest {
  id: string;
  style: TextStyle;
}

export interface MeasurementRequests {
  text: TextMeasurementRequest[];
  styles: StyleMeasurementRequest[];
}

// ============================================
// MEASUREMENT RESULTS
// ============================================

export interface MeasurementResults {
  textHeights: Map<string, number>;   // id -> height in inches
  lineHeights: Map<string, number>;   // style id -> line height in inches
}

// ============================================
// KEY GENERATION
// ============================================

function textToString(content: TextContent): string {
  if (typeof content === 'string') return content;
  return content.map(run => typeof run === 'string' ? run : run.text).join('');
}

function makeTextKey(styleName: TextStyleName, availableWidth: number, content: TextContent): string {
  return `text|${styleName}|${availableWidth.toFixed(4)}|${textToString(content)}`;
}

function makeStyleKey(styleName: TextStyleName): string {
  return `style|${styleName}`;
}

// ============================================
// GAP RESOLUTION
// ============================================

function resolveGap(gap: string | undefined, theme: Theme): number {
  switch (gap) {
    case GAP.NONE: return 0;
    case GAP.TIGHT: return theme.spacing.gapTight;
    case GAP.LOOSE: return theme.spacing.gapLoose;
    case GAP.NORMAL:
    default: return theme.spacing.gap;
  }
}

// ============================================
// MEASUREMENT COLLECTOR
// ============================================

export function collectMeasurements(
  node: ElementNode,
  bounds: Bounds,
  theme: Theme
): MeasurementRequests {
  const text: TextMeasurementRequest[] = [];
  const styles: StyleMeasurementRequest[] = [];
  const seenTextIds = new Set<string>();
  const seenStyleIds = new Set<string>();

  function addTextRequest(content: TextContent, styleName: TextStyleName, width: number) {
    const id = makeTextKey(styleName, width, content);
    if (!seenTextIds.has(id)) {
      seenTextIds.add(id);
      text.push({ id, content, style: theme.textStyles[styleName], availableWidth: width });
    }
  }

  function addStyleRequest(styleName: TextStyleName) {
    const id = makeStyleKey(styleName);
    if (!seenStyleIds.has(id)) {
      seenStyleIds.add(id);
      styles.push({ id, style: theme.textStyles[styleName] });
    }
  }

  function collect(node: ElementNode, bounds: Bounds): void {
    switch (node.type) {
      case 'text': {
        const styleName = node.style ?? TEXT_STYLE.BODY;
        addTextRequest(node.content, styleName, bounds.w);
        addStyleRequest(styleName);
        break;
      }

      case 'list': {
        const styleName = node.style ?? TEXT_STYLE.BODY;
        addStyleRequest(styleName);
        // Each list item needs measurement
        for (const item of node.items) {
          // Account for bullet indent (approximate)
          const indentedWidth = bounds.w - theme.spacing.gap;
          addTextRequest(item, styleName, indentedWidth);
        }
        break;
      }

      case 'card': {
        const cardBounds = bounds.inset(theme.spacing.padding);
        // Image takes ~40% if present
        let contentBounds = cardBounds;
        if (node.image || node.icon) {
          const imageHeight = cardBounds.h * 0.4;
          contentBounds = new Bounds(
            cardBounds.x,
            cardBounds.y + imageHeight + theme.spacing.gapTight,
            cardBounds.w,
            cardBounds.h - imageHeight - theme.spacing.gapTight
          );
        }
        if (node.title) {
          addTextRequest(node.title, TEXT_STYLE.H4, contentBounds.w);
          addStyleRequest(TEXT_STYLE.H4);
        }
        if (node.description) {
          addTextRequest(node.description, TEXT_STYLE.BODY, contentBounds.w);
          addStyleRequest(TEXT_STYLE.BODY);
        }
        break;
      }

      case 'table': {
        // Table cells use BODY style
        addStyleRequest(TEXT_STYLE.BODY);
        const cellWidth = bounds.w / (node.data[0]?.length || 1);
        const cellContentWidth = cellWidth - theme.spacing.cellPadding * 2;
        for (const row of node.data) {
          for (const cell of row) {
            addTextRequest(cell, TEXT_STYLE.BODY, cellContentWidth);
          }
        }
        break;
      }

      case 'row': {
        const gap = resolveGap(node.gap, theme);
        const n = node.children.length;
        const totalGap = gap * (n - 1);
        const availableWidth = bounds.w - totalGap;

        // Divide by proportions or equally
        const proportions = node.proportions ?? node.children.map(() => 1);
        const totalProp = proportions.reduce((a, b) => a + b, 0);

        let x = bounds.x;
        for (let i = 0; i < n; i++) {
          const childWidth = (proportions[i] / totalProp) * availableWidth;
          const childBounds = new Bounds(x, bounds.y, childWidth, bounds.h);
          collect(node.children[i], childBounds);
          x += childWidth + gap;
        }
        break;
      }

      case 'column': {
        const gap = resolveGap(node.gap, theme);
        // For measurement, we give each child the full width
        // Height will be computed in layout phase
        for (const child of node.children) {
          collect(child, bounds);
        }
        break;
      }

      case 'group': {
        const gap = resolveGap(node.gap, theme);
        const cols = node.columns ?? node.children.length;
        const totalGap = gap * (cols - 1);
        const cellWidth = (bounds.w - totalGap) / cols;

        for (const child of node.children) {
          const childBounds = new Bounds(bounds.x, bounds.y, cellWidth, bounds.h);
          collect(child, childBounds);
        }
        break;
      }

      case 'diagram': {
        // Diagram text uses SMALL style
        addStyleRequest(TEXT_STYLE.SMALL);
        for (const box of node.nodes) {
          // Approximate box width
          addTextRequest(box.label, TEXT_STYLE.SMALL, bounds.w / node.nodes.length);
        }
        break;
      }

      case 'image':
      case 'line':
      case 'slideNumber':
        // No text measurement needed
        break;
    }
  }

  collect(node, bounds);
  return { text, styles };
}

// ============================================
// MEASUREMENT LOOKUP
// ============================================

export function getTextHeight(
  results: MeasurementResults,
  content: TextContent,
  styleName: TextStyleName,
  availableWidth: number
): number {
  const id = makeTextKey(styleName, availableWidth, content);
  const height = results.textHeights.get(id);
  if (height === undefined) {
    throw new Error(`Text measurement not found: ${id.slice(0, 60)}...`);
  }
  return height;
}

export function getLineHeight(
  results: MeasurementResults,
  styleName: TextStyleName
): number {
  const id = makeStyleKey(styleName);
  const height = results.lineHeights.get(id);
  if (height === undefined) {
    throw new Error(`Line height not found for style: ${styleName}`);
  }
  return height;
}
