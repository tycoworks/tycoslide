# Sizing & Layout Model

## How it works

Every component answers one question: **"At this width, how tall is my content?"**

```typescript
interface Component {
  getHeight(width: number): number;
  getWidth?(height: number): number;    // For intrinsic width (images in rows)
  prepare(bounds: Bounds, alignContext?: AlignContext): Drawer;
}
```

There is one height method, one code path, one source of truth. Yoga is always used for container layout — no arithmetic shortcuts.

## Per-component sizing

| Component | `getHeight(width)` | Notes |
|-----------|-------------------|-------|
| **Text** | Wrapped text height at `width` | Measured via fontkit |
| **Divider** | `theme.spacing.gapSmall` | Fixed |
| **BulletList** | Sum of item heights at `width` | Deterministic |
| **Table** | Row heights at `width` | Deterministic |
| **Card** | `padding*2 + innerBox.getHeight(innerWidth)` | Content-sized |
| **Image** | `min(width / aspectRatio, pixelHeight / minDisplayDPI)` | DPI-capped natural height |
| **Box (leaf)** | `content.getHeight(width)` | Delegates to content |
| **Box (container)** | Runs Yoga layout | Always correct for flex rows |

## Slide-specific Yoga defaults

Yoga assumes web layout (scrollable, overflow OK). Slides are fixed-size: no scrollbars, no wrapping, no overflow. Box overrides accordingly in `applySlideDefaults()`:

```typescript
node.setFlexShrink(1);   // Shrink to fit (Yoga default: 0 = overflow)
node.setMinHeight(0);    // Allow shrinking below content size
node.setMinWidth(0);
```

These are set on every node before any props-based configuration.

## `expand()` — opt-in growth

All children shrink by default (CSS-like defaults). `expand()` is the only way to opt into growth:

```typescript
export function expand(component: Component): Box {
  return box({ flex: 1, content: component });
}
```

**"Grow beyond intrinsic size to fill available space."**

| Scenario | Without `expand()` | With `expand()` |
|----------|-------------------|-----------------|
| Image in column | Natural DPI-capped height | Fills available space |
| Card row in column | Row's content height | Fills available space |
| Icon grid rows | Content-sized rows | Rows divide space evenly |

### When `expand()` is needed

- Hero images that should fill the slide
- Icon/illustration grids where rows divide space evenly
- SPACE_EVENLY containers where items share extra space
- Any element that should be larger than its content

### When `expand()` is NOT needed

- Images in cards (self-size at natural height)
- Cards in rows (content-sized)
- Text elements (content-sized, always were)

## Image sizing

Images report their DPI-capped natural height — the honest answer to "how tall is your content?"

```typescript
getHeight(width: number): number {
  const naturalHeight = width / this.aspectRatio;
  const maxFromQuality = this.pixelHeight / this.theme.spacing.minDisplayDPI;
  return Math.min(naturalHeight, maxFromQuality);
}
```

`minDisplayDPI` (default: 96) prevents blurry upscaling of small images. A 64x64 icon at 96 DPI caps at 0.67" — it won't stretch to fill a 3" space.

## Row layout

Rows default to equal flex for all children (each child gets proportional width). If any child has an explicit `expand()` wrapper, equal-flex is suppressed — only expanded children grow, the rest stay content-sized.

## Overflow detection

`Box.prepare()` checks computed bounds against the container. If content extends beyond the container by more than Yoga's rounding tolerance (~0.035"), it throws a descriptive error with the full layout path.
