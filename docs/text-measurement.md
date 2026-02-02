# Text Measurement & Component Sizing

**Status:** Not yet implemented - this document describes a planned architectural change.

---

## The Problem

1. **Bullet wrap issue:** Slide 16 bullets wrap unexpectedly in Google Slides
2. **Editability:** Our manual line breaks make output hard to edit - users have to undo our breaks
3. **Cross-platform variance:** We can't guarantee how PowerPoint/Keynote/Google Slides render text

## Current Approach (Problems)

```
fontkit measures → we inject softBreakBefore → wrap: false → pptxgenjs renders
```

- We pre-wrap text ourselves based on fontkit measurement
- We inject `softBreakBefore` to force line breaks at specific points
- We pass `wrap: false` to pptxgenjs
- **Result:** Output is hard to edit, and still doesn't render consistently

## Proposed Approach

```
fontkit estimates height → wrap: true → pptxgenjs/PowerPoint handles wrapping
```

- Use fontkit only for **height estimation** (needed for layout)
- Let PowerPoint handle **actual word wrapping** (`wrap: true`)
- Accept that our height estimates might be slightly off
- **Result:** More editable output, simpler code, "good enough" layout

---

## Philosophy: Estimation, Not Control

We can't control how text renders across applications. So:

1. **Estimate heights** for layout purposes (fontkit)
2. **Let PowerPoint wrap** the actual text
3. **Account for known offsets** (bullet indent)
4. **Accept imperfection** - good enough is good enough

---

## Changes

### Text.ts - Remove manual wrapping

**Before:**
```typescript
// Pre-wrap with fontkit, inject softBreakBefore
const lines = this.wrapContent(style, defaultWeight, bounds.w);
const lineRuns = splitRunsIntoLines(normalized, lines);
// ... build pptxContent with softBreakBefore for each line
slide.addText(pptxContent, { wrap: false, ... });
```

**After:**
```typescript
// Just build runs with styling, let PowerPoint wrap
const pptxContent = normalized.map(run => ({
  text: run.text,
  options: { color, fontFace, highlight, ... }
}));
slide.addText(pptxContent, { wrap: true, ... });
```

`getHeight()` still uses fontkit to estimate - this is needed for layout.

### List.ts - Same simplification

**Before:**
```typescript
const lines = this.wrapItem(item, textStyle, defaultWeight, bounds.w);
const lineRuns = splitRunsIntoLines(normalized, lines);
// ... complex line-by-line processing with softBreakBefore
slide.addText(textObjects, { wrap: false, ... });
```

**After:**
```typescript
// Build items with bullet options, let PowerPoint wrap
slide.addText(textObjects, { wrap: true, ... });
```

### Bullet indent - still needed

Even with native wrapping, we need to account for bullet indent in height estimation:

```typescript
// In List.getHeight:
const bulletIndent = theme.spacing.bulletIndent;
const lines = this.wrapItem(item, textStyle, defaultWeight, width - bulletIndent);
```

And pass explicit indent to pptxgenjs:
```typescript
options.bullet = { color: markerColor, indent: inToPt(bulletIndent) };
```

### Theme additions

```typescript
spacing: {
  bulletIndent: 0.25,    // 18pt in inches
  measurementBuffer: 0.95,  // 5% safety margin for cross-platform variance
}
```

### Measurement buffer concept

A global `measurementBuffer` (0.0-1.0) that scales all width measurements:

```typescript
// In getHeight / wrapContent:
const effectiveWidth = width * theme.spacing.measurementBuffer;
const lines = wrapText(text, font, fontSize, effectiveWidth);
```

**Use cases:**
- `1.0` = trust our measurements exactly (current behavior)
- `0.95` = 5% buffer (recommended default)
- `0.90` = 10% buffer (extra safety for problematic content)

This gives a quick toggle to tighten/loosen all layouts without changing individual components.

---

## Files to Modify

| File | Change |
|------|--------|
| `core/components/Text.ts` | Remove splitRunsIntoLines, pass `wrap: true` |
| `core/components/List.ts` | Remove line-by-line processing, pass `wrap: true`, add bulletIndent |
| `core/components/Table.ts` | Rewrite to use native `slide.addTable()` |
| `core/types.ts` | Add `bulletIndent`, `measurementBuffer` to spacing |
| `core/layout.ts` | Add `inToPt()` helper |
| `materialize/theme.ts` | Add `bulletIndent: 0.25`, `measurementBuffer: 0.95` |

---

## What We Keep

- `wrapText()` in font-utils.ts - still used for height estimation
- `getLineHeight()` - still used for height estimation
- `measureText()` - still used for height estimation

These are for **estimation only**, not for injecting breaks.

---

## Trade-offs

| Aspect | Before | After |
|--------|--------|-------|
| Height accuracy | Tries to be exact | Estimates (may be slightly off) |
| Cross-platform | Varies anyway | Varies (same) |
| Editability | Hard (manual breaks) | Easy (native wrap) |
| Code complexity | High | Lower |
| Rich text styling | Works | Works (simpler) |

---

## Table Component Strategy

### The Issue

Native pptxgenjs tables (`slide.addTable()`) do NOT support images in cells - only text. Our current Table.ts uses shapes/lines and can contain any Component (images, text, etc.).

### Proposal

| Component | Implementation | Use Case |
|-----------|---------------|----------|
| **table()** | Native `slide.addTable()` | Data tables (text only) - simpler, native word wrap |
| **grid()** | Current shape-based (enhanced) | Layouts with images, cards, mixed content |

### Changes

1. **Rewrite Table.ts** to use native pptxgenjs `slide.addTable()`
   - Text-only cells
   - Native word wrap (no fontkit measurement needed for cells)
   - Still use fontkit for height estimation (for layout)
   - Simpler, more editable output

2. **Enhance Grid.ts** to support borders/styling when needed
   - Keep current shape-based approach
   - Can contain any Component
   - For use cases like image grids, card layouts, etc.

### Native Table Benefits

- Word wrap handled by PowerPoint
- Easier to edit in PowerPoint
- Less code to maintain
- Column widths still controlled via props

---

## getWidth for Text Components

### The Dual Constraint Problem

Components have two sizing methods:
- `getHeight(width)` - given width, how tall is my content?
- `getWidth(height)` - given height, how wide do I need to be?

For Image, this is straightforward: aspect ratio gives direct conversion.

For text-based components (Text, List, Divider), `getWidth(height)` is solvable:

### Algorithm

Given a height constraint:
1. Calculate how many lines fit: `maxLines = floor(height / lineHeight)`
2. Find the narrowest width that wraps text into ≤ maxLines

Step 2 is a binary search:
```typescript
getWidth(height: number): number {
  const lineHeight = getLineHeight(fontPath, fontSize);
  const maxLines = Math.floor(height / lineHeight);

  if (maxLines < 1) return Infinity;  // Can't fit

  // Binary search for minimum width
  let lo = 0;
  let hi = measureText(fullText, fontPath, fontSize);  // Single-line width

  while (hi - lo > 0.01) {  // 0.01" precision
    const mid = (lo + hi) / 2;
    const lines = wrapText(text, fontPath, fontSize, mid);
    if (lines.length <= maxLines) {
      hi = mid;  // Fits - try narrower
    } else {
      lo = mid;  // Doesn't fit - need wider
    }
  }

  return hi;
}
```

### Status

Not yet implemented - haven't needed it since Text/List aren't used in ROW layouts where they'd need to report intrinsic width. When needed, the algorithm above works.

---

## Verification

1. `npm run messaging && open messaging.pptx`
2. Edit text in PowerPoint - verify word wrap works naturally
3. Open in Google Slides - verify reasonable rendering
4. Check vertical layout still works (spacers center correctly)
5. Check tables are editable (native behavior)
