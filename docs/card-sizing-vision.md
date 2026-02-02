# Card Sizing Vision

## The Problem

Card slides in tycoslide currently fill 100% of available vertical space. A three-card row with small images and short text balloons to occupy the entire slide body, creating oversized cards with excessive internal whitespace. The cards look inflated rather than elegant.

**Concrete symptoms (showcase slides 4 & 5):**
- Cards stretch to fill the full body height (~3.7" after header/margins)
- Portrait images get surrounded by dead whitespace
- Small icon images (64×64 px) get the same card height as large illustrations
- Cards feel like walls, not content objects floating in space

## Root Cause Analysis

### The flex:1 trap

The card image box currently has `flex: 1` (in `card.ts` line 40):

```typescript
children.push(box({ flex: 1, content: new Image(this.theme, this.props.image) }));
```

This was added to prevent text from being crushed when cards are constrained. But it introduces the opposite problem: **images expand to fill all remaining space**, making cards as tall as the container allows.

### Why flex:1 was added (and why it's wrong)

Without `flex: 1`, when a card is placed in a constrained container (e.g., a STRETCH row inside a SPACE_EVENLY column), Yoga shrinks all children proportionally. The `applySlideDefaults()` in `box.ts` sets:

```typescript
node.setFlexShrink(1);   // All children shrink equally
node.setMinHeight(0);    // No minimum — children can shrink to zero
```

This means text and image shrink at the same rate. Text gets crushed to unreadable heights while the image still has plenty of room to spare. Adding `flex: 1` to the image "fixed" this by setting `flexBasis: 0` — the image contributes zero to the card's measured height, so during `getHeight()` the card measures as text-only height. During `prepare()`, the image expands to fill remaining space.

**This is masking the real bug.** The real bug is that `flexShrink: 1` on all children means proportional shrinking, and proportional shrinking is wrong for cards where the image is the expendable element and text must be preserved.

### The measurement vs. layout mismatch

| Phase | With `flex: 1` | Without `flex: 1` |
|-------|----------------|-------------------|
| `getHeight()` | Image basis = 0, card measures as **text-only** height | Image reports full natural height, card is **honestly sized** |
| `prepare()` | Image **grows** to fill all remaining container space | Image **shrinks** proportionally, crushing text |

Neither behavior is correct. We need: honest measurement (without flex:1) + smart shrinking (image absorbs shrinkage first).

## Design Principles

These principles come from established layout and typography systems.

### 1. Content Hugging (Apple Human Interface Guidelines)

Elements should resist expanding beyond their intrinsic content size. A card with a 200×150px image and two lines of text should be exactly that tall, plus padding — not inflated to fill a 3.7" container.

### 2. Whitespace Distribution (TeX Badness Model)

TeX penalizes layout "looseness" cubically: `badness = 100r³`, where `r` is the stretch ratio. This means:
- Small amounts of distributed whitespace (between cards via SPACE_EVENLY) look fine
- Large amounts of whitespace stuffed inside cards look terrible

**The whitespace should be between cards, not inside them.**

### 3. The 60/40 Rule (Golden Ratio)

Content should occupy roughly 60-65% of available space, with 35-40% as breathing room. When cards fill 100% of the body, there's no breathing room. SPACE_EVENLY handles this naturally — but only if cards report their honest content height.

### 4. Material Design Card Patterns

Cards are "surfaces that display content and actions on a single topic." They are content-sized containers with consistent internal padding, not space-filling blocks. Google's Material Design uses 8dp grid spacing between cards, not inside them.

### 5. Discrete Sizing

Given fixed text sizes (fontSize 12, 14, 18, 20) and fixed line heights, cards already land on a discrete set of heights. A card with one H4 title + two lines of SMALL description will always be the same height. This is natural — we don't need to engineer discrete sizes, we just need to stop inflating cards beyond their content.

## The Vision

**Cards should be content-hugging objects that float in managed whitespace.**

```
Current (wrong):
┌──────────────────────────────────────────┐
│ Header                                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │  │
│ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │  │
│ │ ▓ image ▓ │ │ ▓ image ▓ │ │ ▓ image ▓ │  │
│ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │  │  ← cards fill 100%
│ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │  │
│ │ Title    │ │ Title    │ │ Title    │  │
│ │ Desc...  │ │ Desc...  │ │ Desc...  │  │
│ └──────────┘ └──────────┘ └──────────┘  │
└──────────────────────────────────────────┘

Target (correct):
┌──────────────────────────────────────────┐
│ Header                                    │
│                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │  │
│ │ ▓ image ▓ │ │ ▓ image ▓ │ │ ▓ image ▓ │  │  ← cards are content-sized
│ │ Title    │ │ Title    │ │ Title    │  │
│ │ Desc...  │ │ Desc...  │ │ Desc...  │  │
│ └──────────┘ └──────────┘ └──────────┘  │
│                                           │
└──────────────────────────────────────────┘
             whitespace lives here ^
         (managed by SPACE_EVENLY layout)
```

The existing `SPACE_EVENLY` in `contentSlide` already handles whitespace distribution perfectly — it just needs cards to report their honest height instead of growing to fill everything.

## The Fix: `flexShrink` as a BoxProps property

### What's missing

`BoxProps` currently supports `flex` (which sets `flexGrow` + `flexBasis: 0`) but has no way to control `flexShrink` independently. The `applySlideDefaults()` sets `flexShrink: 1` on every node, which means all children shrink at equal rates.

For cards, we need the image to absorb virtually all shrinkage while text is preserved. This requires per-node `flexShrink` control.

### The solution

Add `flexShrink` to `BoxProps`:

```typescript
// box.ts — BoxProps
export interface BoxProps {
  // ... existing props ...
  flexShrink?: number;    // Override slide default (1). Higher = absorbs more shrink.
}
```

Apply it in `configureDimensions()`:

```typescript
private configureDimensions(node: YogaNode): void {
  // ... existing dimension logic ...

  if (this.props.flexShrink !== undefined) {
    node.setFlexShrink(this.props.flexShrink);
  }
}
```

Then in `card.ts`, replace `flex: 1` with `flexShrink: 100`:

```typescript
// Before (wrong — makes image basis 0, then expands):
children.push(box({ flex: 1, content: new Image(this.theme, this.props.image) }));

// After (correct — image measures honestly, but yields space first):
children.push(box({ flexShrink: 100, content: new Image(this.theme, this.props.image) }));
```

### How flexShrink: 100 works

When a card is unconstrained (during `getHeight()`):
- Image reports its full DPI-capped natural height
- Card measures as `padding*2 + image + gap + title + gap + description`
- This is the **honest** content height

When a card is constrained (during `prepare()`, e.g., in a STRETCH row):
- Yoga needs to shrink children to fit the available height
- Shrink is distributed proportionally to `flexShrink` values
- Image has `flexShrink: 100`, text boxes have `flexShrink: 1` (the default)
- Image absorbs ~100/102 of the shrinkage; text is virtually untouched
- Semantically correct: the image is the expendable element

### Why this is better than flex:1

| Behavior | `flex: 1` (current) | `flexShrink: 100` (proposed) |
|----------|---------------------|------------------------------|
| Measurement | Image basis = 0 (dishonest) | Image at natural height (honest) |
| Growth | Image expands to fill space | No growth — content-sized |
| Shrink | All children equal | Image absorbs ~98% of shrinkage |
| Card height | As tall as container allows | As tall as content requires |
| Whitespace | Inside cards (bad) | Between cards via SPACE_EVENLY (good) |

## Additional: cardImageMaxHeight theme constant

Large illustrations (e.g., 800×600px at 96 DPI) report a natural height of 6.25" — taller than the entire slide. The DPI cap helps, but for cards specifically we may want a tighter cap.

Add to theme spacing:

```typescript
spacing: {
  // ... existing ...
  cardImageMaxHeight: 2.5,  // Maximum image height within cards (inches)
}
```

This is a theme-level constant, not a magic number in a component. Different themes can set different values. The card component would apply it as `maxHeight` on the image box:

```typescript
children.push(box({
  flexShrink: 100,
  maxHeight: this.theme.spacing.cardImageMaxHeight,
  content: new Image(this.theme, this.props.image),
}));
```

This prevents pathologically large images from dominating the card while still allowing the image to be content-sized within reasonable bounds.

## Implementation Plan

### Phase 1: Add flexShrink to BoxProps

**Files:** `src/core/box.ts`

1. Add `flexShrink?: number` to `BoxProps` interface
2. In `configureDimensions()`, apply `flexShrink` if set: `node.setFlexShrink(props.flexShrink)`

This is a non-breaking change. No existing behavior changes because no existing code sets `flexShrink`.

### Phase 2: Fix card image sizing

**Files:** `src/components/card.ts`

1. Replace `box({ flex: 1, content: new Image(...) })` with `box({ flexShrink: 100, content: new Image(...) })`
2. The image now measures at natural height but yields space first when constrained

### Phase 3: Add cardImageMaxHeight (if needed)

**Files:** `src/core/types.ts` (Spacing interface), theme files

1. Add `cardImageMaxHeight?: number` to the Spacing interface
2. Set a reasonable default (e.g., 2.5") in themes
3. Apply in `card.ts` as `maxHeight` on the image box

This phase may not be needed if Phase 2 alone produces good results. Test first.

### Phase 4: Validate

- Regenerate showcase.pptx
- Check slides 4 & 5 (two-card with images, three-card with images)
- Check slide 6 (cards with small icon images)
- Check slides 13-14 (two-column with cards + images)
- Verify no text crushing in any layout
- Verify cards are content-sized, not container-filling

## Open Questions

1. **Row STRETCH interaction:** Cards in a row use `alignItems: STRETCH`, which makes all cards match the tallest card's height. With content-sized cards, the tallest card sets the row height and shorter cards stretch to match. This is correct behavior (equal-height cards in a row look right). But does the `flexShrink: 100` image still work correctly when the card is stretched taller than its content? (The image should grow into the extra space since it's within the card, not the slide.)

2. **Text-only cards:** Cards without images have no high-shrink element. Under extreme constraint, text could still crush. But text-only cards are much shorter, so they're less likely to overflow. Monitor but don't prematurely optimize.

3. **cardImageMaxHeight value:** The right value depends on typical slide layouts. 2.5" is a guess. May need adjustment after testing with real content. Could also be derived (e.g., `slideHeight * 0.4`) rather than absolute.
