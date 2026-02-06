// List Component
// Implements list as a component using primitives: column, row, text

import { componentRegistry, type ExpansionContext, type ComponentNode } from '../core/component-registry.js';
import { column, row, text } from '../core/dsl.js';
import type { ElementNode, TextNode } from '../core/nodes.js';
import type { TextContent, TextStyleName } from '../core/types.js';
import { TEXT_STYLE, GAP, VALIGN } from '../core/types.js';
import { toTextContent } from '../utils/node-utils.js';

// ============================================
// TYPES
// ============================================

/** List item can be plain text, styled text runs, or a TextNode */
export type ListItemContent = TextContent | TextNode;

export interface ListComponentProps {
  /** List items */
  items: ListItemContent[];
  /** Text style for items */
  style?: TextStyleName;
  /** Whether list is ordered (numbered) or unordered (bullets) */
  ordered?: boolean;
  /** Text color for items */
  color?: string;
  /** Color for bullet/number markers */
  markerColor?: string;
  /** Gap between items */
  gap?: typeof GAP[keyof typeof GAP];
}

// ============================================
// COMPONENT DEFINITION
// ============================================

/**
 * Expand list props into primitive node tree.
 *
 * Structure:
 * ```
 * column({ gap },
 *   row(bullet, content),  // item 1
 *   row(bullet, content),  // item 2
 *   ...
 * )
 * ```
 */
function expandList(props: ListComponentProps, context: ExpansionContext): ElementNode {
  const {
    items,
    style = TEXT_STYLE.BODY,
    ordered = false,
    color,
    markerColor,
    gap = GAP.TIGHT,
  } = props;

  if (items.length === 0) {
    return column(); // Empty list
  }

  const theme = context.theme;
  const bulletIndent = theme.spacing.gap; // Width for bullet column

  // Create rows for each item
  const itemRows = items.map((item, index) => {
    // Bullet or number marker
    const marker = ordered ? `${index + 1}.` : '•';
    const markerNode = text(marker, {
      style,
      color: markerColor ?? color,
    });

    // Item content
    const itemContent = typeof item === 'object' && 'type' in item && item.type === 'text'
      ? item as TextNode
      : text(toTextContent(item), { style, color });

    // Row: fixed-width bullet column + fill content
    return row(
      { gap: GAP.TIGHT, vAlign: VALIGN.TOP },
      column({ width: bulletIndent }, markerNode),
      itemContent
    );
  });

  return column({ gap }, ...itemRows);
}

// ============================================
// REGISTRATION
// ============================================

/**
 * Register the list component with the global registry.
 */
export function registerListComponent(): void {
  if (!componentRegistry.has('list')) {
    componentRegistry.register({
      name: 'list',
      expand: expandList,
    });
  }
}

// ============================================
// DSL FUNCTIONS
// ============================================

/**
 * Create a list component node.
 *
 * @example
 * ```typescript
 * listComponent(['First item', 'Second item', 'Third item'], {
 *   ordered: true,
 *   style: TEXT_STYLE.BODY,
 * })
 * ```
 */
export function listComponent(
  items: ListItemContent[],
  props?: Omit<ListComponentProps, 'items'>
): ComponentNode<ListComponentProps> {
  return {
    type: 'component',
    componentName: 'list',
    props: { ...props, items },
  };
}

/**
 * Create a bullet (unordered) list component.
 */
export function bulletListComponent(
  items: ListItemContent[],
  props?: Omit<ListComponentProps, 'items' | 'ordered'>
): ComponentNode<ListComponentProps> {
  return listComponent(items, { ...props, ordered: false });
}

/**
 * Create a numbered (ordered) list component.
 */
export function numberedListComponent(
  items: ListItemContent[],
  props?: Omit<ListComponentProps, 'items' | 'ordered'>
): ComponentNode<ListComponentProps> {
  return listComponent(items, { ...props, ordered: true });
}

// Auto-register on import
registerListComponent();
