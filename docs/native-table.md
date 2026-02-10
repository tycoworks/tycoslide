# Native pptxgenjs Table Implementation

## Status: Pending

This document captures the design for replacing the current custom table component with native pptxgenjs table support.

---

## Executive Summary

Replace the current table component (which draws tables using primitives like lines and rectangles) with a new element type that renders directly via `slide.addTable()`.

## Key Design Decisions

### 1. Element Type (not Component)

Implement as `NODE_TYPE.TABLE` element that renders directly, not as a component that expands to primitives.

### 2. Node Structure

```typescript
export interface TableNode {
  type: typeof NODE_TYPE.TABLE;
  rows: TableCellData[][];
  columnWidths?: number[];
  rowHeights?: (number | 'auto')[];
  headerRows?: number;
  headerColumns?: number;
  style?: TableStyleProps;
}

export interface TableCellData {
  content: TextContent;
  colspan?: number;
  rowspan?: number;
  fill?: string;
  textStyle?: TextStyleName;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

export interface TableStyleProps {
  borderStyle?: 'full' | 'internal' | 'horizontal' | 'vertical' | 'none';
  borderColor?: string;
  borderWidth?: number;
  headerBackground?: string;
  headerTextStyle?: TextStyleName;
  cellBackground?: string;
  cellTextStyle?: TextStyleName;
  cellPadding?: number;
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}
```

### 3. DSL Function

```typescript
table([
  ['Name', 'Role', 'Status'],
  ['Alice', 'Engineer', 'Active'],
], { headerRows: 1, style: { headerBackground: 'E0E0E0' } })
```

### 4. Text Measurement Strategy

Use estimation based on:
- Character count per cell
- Font size from theme
- Column widths
- Cell padding

Let pptxgenjs handle actual cell sizing, but provide height estimates to layout engine for overflow detection.

### 5. Explicit Configuration (No Defaults)

Every cell must explicitly set:
- `fontFace`, `fontSize`, `color`
- `align`, `valign`
- `margin` (cell padding)
- `fill` (background)
- `border` arrays (TRBL)

Do NOT rely on pptxgenjs defaults.

### 6. Border Style Mapping

Map our border styles to per-cell TRBL border arrays:

| Style | Top | Right | Bottom | Left |
|-------|-----|-------|--------|------|
| full | solid | solid | solid | solid |
| internal | edge-aware | edge-aware | edge-aware | edge-aware |
| horizontal | solid | none | solid | none |
| vertical | none | solid | none | solid |
| none | none | none | none | none |

## Files to Create/Modify

### New Files
- `src/elements/table.ts` - TableNode element handler

### Modified Files
- `src/core/nodes.ts` - Add NODE_TYPE.TABLE and interfaces
- `src/core/dsl.ts` - Add table() function
- `src/core/pptxRenderer.ts` - Add renderTable() method
- `src/elements/index.ts` - Export tableHandler

## Migration Path

1. Implement as `table2()` initially
2. Run both implementations in parallel
3. Deprecate old `table()` component
4. Rename `table2()` to `table()`
5. Remove old component

## pptxgenjs Table API Reference

```typescript
slide.addTable(tableRows: TableRow[], options?: TableProps)

interface TableCell {
  text?: string | TableCell[]
  options?: TableCellProps
}

interface TableCellProps {
  border?: BorderProps | [BorderProps, BorderProps, BorderProps, BorderProps]
  colspan?: number
  rowspan?: number
  fill?: ShapeFillProps
  margin?: Margin
  color, fontFace, fontSize, bold, italic, align, valign
}

interface TableProps {
  x, y, w, h?: number
  colW?: number | number[]
  rowH?: number | number[]
  border?: BorderProps
  fill?: ShapeFillProps
  margin?: Margin
}
```

## Trade-offs

| Aspect | Native Table | Current Primitive Approach |
|--------|--------------|---------------------------|
| Border accuracy | Excellent | Poor |
| Cell merging | Supported | Not possible |
| Text wrapping | PowerPoint handles | Manual measurement |
| Nested content | Text only | Any element (theoretical) |
| Height prediction | Estimated | Accurate via measurement |
| Complexity | Lower | Higher |
