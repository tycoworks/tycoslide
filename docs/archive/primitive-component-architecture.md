# Primitive + Component Architecture

## Overview

Refactor tycoslide to cleanly separate **primitives** (fixed minimal set in core) from **components** (Card, Table, List built from primitives). This reduces code duplication, simplifies compute-layout.ts, and enables theme packages to define custom components.

## Problem Summary

| Issue | Impact |
|-------|--------|
| 11 NODE_TYPEs with overlapping behavior | 3 switch statements × 11 cases = maintenance burden |
| Card/Table/List are special-cased everywhere | ~100-150 lines each across compute-layout.ts, render.ts |
| Adding new "component" requires modifying core | 5+ files to add a new node type |
| Themes can't define custom components | All types must be in core library |

## Architecture

### 1. Minimal Primitive Set (8 types)

```typescript
export const NODE_TYPE = {
  // Content
  TEXT: 'text',
  IMAGE: 'image',
  LINE: 'line',
  SLIDE_NUMBER: 'slideNumber',

  // Layout
  ROW: 'row',
  COLUMN: 'column',
  GROUP: 'group',

  // Visual (new)
  BOX: 'box',  // Rectangle with fill/border/radius/padding
} as const;
```

### 2. Component System

Two-layer architecture:

```
USER CODE:        card({ title: "Hello" })   table(data)
                           │
                           ▼ expand()
COMPOSITE DEFS:   Registry of (name → expansion function)
                           │
                           ▼ primitive tree
CORE LIBRARY:     Only knows: TEXT, IMAGE, BOX, ROW, COLUMN, GROUP, LINE, SLIDE_NUMBER
```

### 3. DSL Syntax

```typescript
// Generic component function
export function component<TProps>(name: string, props: TProps): ComponentNode {
  return { type: 'component', componentName: name, props };
}

// Convenience wrappers (preserve existing API)
export function card(props: CardProps): ComponentNode {
  return component('card', props);
}

export function table(data, props?): ComponentNode {
  return component('table', { data, ...props });
}
```

### 4. Box Primitive

New primitive for visual containers:

```typescript
export interface BoxNode {
  type: typeof NODE_TYPE.BOX;
  child?: ElementNode;           // Single child (typically Column)
  fill?: { color: string };      // Background color
  border?: {                     // Border (all sides or per-side)
    color?: string;
    width?: number;
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
  cornerRadius?: number;         // Border radius
  padding?: number;              // Inner padding
  width?: number | SizeValue;
  height?: number | SizeValue;
}
```

### 5. Card Expansion Example

```typescript
const cardComponent: ComponentDefinition<CardProps> = {
  name: 'card',
  expand: (props, { theme }) => ({
    type: NODE_TYPE.BOX,
    fill: { color: props.backgroundColor ?? theme.colors.secondary },
    border: { color: props.borderColor },
    cornerRadius: theme.borders.radius,
    padding: props.padding ?? theme.spacing.padding,
    child: {
      type: NODE_TYPE.COLUMN,
      gap: props.gap ?? GAP.TIGHT,
      children: [
        props.title && { type: NODE_TYPE.TEXT, content: props.title, style: TEXT_STYLE.H4 },
        props.description && { type: NODE_TYPE.TEXT, content: props.description },
        ...props.children,
      ].filter(Boolean),
    },
  }),
};
```

### 6. Table Expansion Example

```typescript
const tableComponent: ComponentDefinition<TableProps> = {
  name: 'table',
  expand: (props, { theme }) => {
    const { data, headerRow, headerColumn, columnWidths } = props;
    const rows = data.map((rowData, rowIndex) => ({
      type: NODE_TYPE.ROW,
      gap: 0,
      children: rowData.map((cellContent, colIndex) => ({
        type: NODE_TYPE.BOX,
        fill: getTableCellBackground(rowIndex, colIndex, props, theme),
        border: getTableCellBorder(rowIndex, colIndex, props, theme),
        padding: theme.spacing.tablePadding,
        width: columnWidths?.[colIndex],
        child: {
          type: NODE_TYPE.TEXT,
          content: cellContent,
          style: isHeader(rowIndex, colIndex, props) ? TEXT_STYLE.TABLE_HEADER : TEXT_STYLE.TABLE_CELL,
        },
      })),
    }));

    return {
      type: NODE_TYPE.COLUMN,
      gap: 0,
      children: rows,
    };
  },
};
```

### 7. List Expansion Example

```typescript
const listComponent: ComponentDefinition<ListProps> = {
  name: 'list',
  expand: (props, { theme }) => ({
    type: NODE_TYPE.COLUMN,
    gap: props.gap ?? GAP.TIGHT,
    children: props.items.map((item, index) => ({
      type: NODE_TYPE.ROW,
      gap: GAP.TIGHT,
      children: [
        // Bullet or number
        {
          type: NODE_TYPE.TEXT,
          content: props.ordered ? `${index + 1}.` : '•',
          style: props.style ?? TEXT_STYLE.BODY,
        },
        // Item content
        typeof item === 'string'
          ? { type: NODE_TYPE.TEXT, content: item, style: props.style ?? TEXT_STYLE.BODY }
          : item, // Already a node
      ],
    })),
  }),
};
```

### 8. Where Definitions Live

```
tycoslide/                      # Core library
  src/core/
    nodes.ts                    # Only primitives (8 types)
    component-registry.ts       # Registry mechanism
  src/components/               # Default card, table, list
    card.ts
    table.ts
    list.ts
    index.ts                    # Registers defaults

materialize/theme/              # Theme package
  src/components/               # Theme-specific components
    customer-grid.ts            # Custom component
```

### 9. ComponentRegistry

```typescript
export interface ComponentDefinition<TProps> {
  name: string;
  expand: (props: TProps, context: ExpansionContext) => ElementNode;
}

export interface ExpansionContext {
  theme: Theme;
  slideIndex?: number;
}

class ComponentRegistry {
  private definitions = new Map<string, ComponentDefinition<any>>();

  register<TProps>(definition: ComponentDefinition<TProps>): void {
    this.definitions.set(definition.name, definition);
  }

  expand(node: ComponentNode, context: ExpansionContext): ElementNode {
    const def = this.definitions.get(node.componentName);
    if (!def) throw new Error(`Unknown component: ${node.componentName}`);
    return def.expand(node.props, context);
  }

  expandTree(node: ElementNode | ComponentNode, context: ExpansionContext): ElementNode {
    // Recursively expand all components in a tree
    if (isComponent(node)) {
      return this.expandTree(this.expand(node, context), context);
    }
    // Recurse into children
    if ('children' in node && Array.isArray(node.children)) {
      return { ...node, children: node.children.map(c => this.expandTree(c, context)) };
    }
    if ('child' in node && node.child) {
      return { ...node, child: this.expandTree(node.child, context) };
    }
    return node;
  }
}

export const registry = new ComponentRegistry();
```

### 10. Expansion Point

Expansion happens at `Presentation.add()` time:

```typescript
class Presentation {
  add(content: ElementNode | ComponentNode): this {
    const expanded = registry.expandTree(content, {
      theme: this.theme,
      slideIndex: this.slides.length,
    });
    // Now only deals with primitives
    this.slides.push(expanded);
    return this;
  }
}
```

## Impact

| Metric | Before | After |
|--------|--------|-------|
| Core NODE_TYPEs | 11 | 8 |
| compute-layout.ts complexity | ~700 lines | ~450 lines |
| Adding new component | Modify 5 core files | Add 1 definition file |
| Existing API | card(), table() | Unchanged |

## Diagram Special Case

Diagram stays as a special type but expands to Image after external rendering:

```
DiagramNode → Mermaid CLI → PNG → ImageNode
```

This is handled in the rendering pipeline before layout, not via ComponentRegistry.

## Migration Path

### Phase 1: Add Box Primitive + ComponentRegistry (Non-breaking)

**Files to create:**
- `src/core/component-registry.ts` - Registry mechanism
- `src/components/` - Directory for component definitions

**Files to modify:**
- `src/core/nodes.ts` - Add NODE_TYPE.BOX and BoxNode interface
- `src/core/compute-layout.ts` - Add Box handling (simple: just padding + single child)
- `src/core/render.ts` - Add Box rendering (fill, border, corner radius)

### Phase 2: Implement Card/Table/List as Components (Non-breaking)

**Files to create:**
- `src/components/card.ts`
- `src/components/table.ts`
- `src/components/list.ts`
- `src/components/index.ts`

**Keep existing:**
- Legacy NODE_TYPE.CARD/TABLE/LIST still work
- New component versions available via `component('card', ...)` etc.

### Phase 3: Wire Expansion into Presentation.add() (Breaking)

**Files to modify:**
- `src/core/presentation.ts` - Add expansion call
- `src/core/dsl.ts` - Update card(), table(), list() to return ComponentNode

**Breaking change:**
- Components now expand to primitives
- Old code that relied on checking `node.type === NODE_TYPE.CARD` breaks

### Phase 4: Remove Legacy NODE_TYPEs (Breaking)

**Files to modify:**
- `src/core/nodes.ts` - Remove CARD, TABLE, LIST from NODE_TYPE
- `src/core/compute-layout.ts` - Remove Card/Table/List cases (~200 lines)
- `src/core/render.ts` - Remove Card/Table/List cases
- `src/core/measure.ts` - Remove Card/Table/List cases

## Verification

1. **All existing tests pass** after each phase
2. **Build succeeds**: `npm run build`
3. **Showcase renders correctly**: Compare before/after
4. **New unit tests**:
   - Box primitive layout and rendering
   - ComponentRegistry expansion
   - Card/Table/List component definitions
5. **Line count reduction**: compute-layout.ts should drop from ~700 to ~450 lines

## Open Questions

1. **Z-order within Box**: Is implicit render order (background → border → child) sufficient?
2. **Per-side borders on Box**: Should border support `{ top: true, bottom: true }` for horizontal rules?
3. **Theme components**: How do themes register their components? At theme load time?
