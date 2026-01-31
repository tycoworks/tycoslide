# Preferred sizing

## The problem

Images have two sizing modes: invisible (minimum height) or greedy (expand to fill all space). There's no middle ground.

This happens because the Yoga measure function returns `getMinimumHeight()` — a tiny constant — as the node's intrinsic size. Yoga interprets this as "the image prefers to be 0.19 inches tall." Without `expand()` wrapping (flex: 1), images stay at minimum. With `expand()`, they fill everything.

Cards compound this: they internally use `expand(image)`, so the image gets flex: 1 inside the card. The card itself then reports unbounded max height, defeating the adaptive capping system.

The result: `expand()` is required everywhere images appear, and cards fill all available space even when the content doesn't need it.

## Design principle

**Components know their preferred size. The layout engine respects it.**

Every component already reports minimum and maximum height. The missing piece: a **preferred height** — what the component would choose if given enough space, informed by its actual content and by design constraints.

For images, preferred height derives from actual pixel dimensions and aspect ratio. For text, preferred equals minimum (wrapped text height is fixed). For cards, preferred cascades from children.

## Phase 1: Preferred height

Add `getPreferredHeight(width)` to the Component interface. Change `setMeasureFunc` to use it. Images self-size to natural height without needing `expand()`.

### Component interface change

```typescript
interface Component {
  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer;
  getMinimumHeight?(width: number): number;    // Floor (unchanged)
  getMaximumHeight?(width: number): number;     // Ceiling (unchanged)
  getPreferredHeight?(width: number): number;   // NEW: design-aware preferred height
  getMinimumWidth?(height: number): number;     // (unchanged)
}
```

### Image changes

```typescript
getMinimumHeight(_width: number): number {
  return 0;  // Images can shrink to nothing if layout demands it
}

getPreferredHeight(width: number): number {
  return width / this.aspectRatio;  // Natural height preserving aspect ratio
}

getMaximumHeight(width: number): number {
  return width / this.aspectRatio;  // Unchanged
}
```

Remove `minImageHeight` from Theme.spacing — it's no longer needed.

### Box.setMeasureFunc change

```typescript
private setMeasureFunc(node: YogaNode, width: number): void {
  const content = this.props.content!;
  node.setMeasureFunc((yogaWidth, widthMode) => {
    const measuredWidth = widthMode === Yoga.MEASURE_MODE_UNDEFINED
      ? width : fromYoga(yogaWidth);
    const h = content.getPreferredHeight?.(measuredWidth)
           ?? content.getMinimumHeight?.(measuredWidth)
           ?? 0;
    const w = content.getMinimumWidth?.(h) ?? 0;
    return { width: toYoga(w), height: toYoga(h) };
  });
}
```

Falls back to `getMinimumHeight` for components without a preferred height (text, list, table, divider). Those components behave identically to today.

### Card changes

```typescript
getPreferredHeight(width: number): number {
  const padding = this.getPadding();
  const innerW = width - padding * 2;
  return padding * 2 + this.getBox().getPreferredHeight(innerW);
}

getMaximumHeight(width: number): number {
  const padding = this.getPadding();
  const innerW = width - padding * 2;
  return padding * 2 + this.getBox().getMaximumHeight(innerW);
}
```

Cards delegate preferred height to their internal Box, which cascades to children. A card with a 16:9 image at 2.67" width computes preferred height as padding + image natural height (1.5") + title + description ≈ 2.4". Previously: 1.1" (minimum) or unbounded (with expand).

### Box.getPreferredHeight

```typescript
getPreferredHeight(width: number): number {
  if (this.props.height !== undefined) return this.props.height;
  if (this.props.maxHeight !== undefined) {
    return Math.min(this.props.maxHeight, this.computePreferred(width));
  }
  return this.computePreferred(width);
}
```

Where `computePreferred` builds a Yoga tree using preferred-based measurement (the same tree used by `getMinimumHeight`, since `setMeasureFunc` now returns preferred).

### What this changes

| Scenario | Before | After |
|----------|--------|-------|
| Image in column (no expand) | 0.19" (invisible) | Natural height |
| Image in column (with expand) | Fills all space | Fills all space (unchanged) |
| Card with image in row | Minimum or greedy | Preferred (image natural + text) |
| Text in column | Wrapped text height | Wrapped text height (unchanged) |
| Icon grid with expand | Even distribution | Even distribution (unchanged) |

### expand() after Phase 1

`expand()` shifts from "required for images to be visible" to "opt-in for explicit fill":

- **Still needed**: hero images, background fills, icon grids (intentional even distribution), `contentSlide`'s inner SPACE_EVENLY column
- **No longer needed**: images in cards, standalone images in columns, cards in rows

## Phase 2: Design principle constraints

Layer design constraints on top of preferred sizing. Two new Theme properties:

### maxContentRatio

```typescript
spacing: {
  maxContentRatio: number;  // Default: 0.6 — max % of content area any element should prefer
}
```

Image.getPreferredHeight becomes:

```typescript
getPreferredHeight(width: number): number {
  const naturalHeight = width / this.aspectRatio;
  const contentHeight = this.theme.slide.height - 2 * this.theme.spacing.margin;
  const maxFromDesign = contentHeight * this.theme.spacing.maxContentRatio;
  return Math.min(naturalHeight, maxFromDesign);
}
```

This encodes the ~60/40 content-to-whitespace principle directly. A portrait image that would naturally be taller than the slide gets capped at 60% of the content area. Landscape images at typical card widths are under the cap and use their natural height.

### minDisplayDPI

```typescript
spacing: {
  minDisplayDPI: number;  // Default: 96 — minimum effective DPI for image display
}
```

Image.getPreferredHeight becomes:

```typescript
getPreferredHeight(width: number): number {
  const naturalHeight = width / this.aspectRatio;
  const contentHeight = this.theme.slide.height - 2 * this.theme.spacing.margin;
  const maxFromDesign = contentHeight * this.theme.spacing.maxContentRatio;
  const maxFromQuality = this.pixelHeight / this.theme.spacing.minDisplayDPI;
  return Math.min(naturalHeight, maxFromDesign, maxFromQuality);
}
```

Prevents small images (icons, thumbnails) from being upscaled beyond sharpness. A 64x64 icon at 96 DPI caps at 0.67" — it won't be stretched to fill a 3" space.

### Three constraints, one formula

```
preferredHeight = min(
  width / aspectRatio,                    // Shape: preserve aspect ratio
  contentArea * maxContentRatio,          // Design: don't dominate the slide
  pixelHeight / minDisplayDPI,            // Quality: don't upscale beyond sharpness
)
```

### Warning system

Console warnings for problems auto-sizing cannot fix:

| Warning | Trigger |
|---------|---------|
| Aspect ratio mismatch | Image AR differs from container AR by > 3:1 |
| Content density | Single element consumes > 90% of available height |
| Low resolution | Image would need > 3x upscaling to reach preferred size |

## Why two phases

Phase 1 is the fundamental Yoga fix — images report their natural size, the measure function communicates it. This alone eliminates most `expand()` calls and makes cards self-size. It can be validated by removing `expand()` wrappers from showcase slides and observing the results.

Phase 2 adds guardrails. Without Phase 1, Phase 2 has nothing to constrain. Without Phase 2, Phase 1 produces correct but occasionally oversized results (portrait images taller than the slide). Phase 1 is independently useful; Phase 2 refines it.
