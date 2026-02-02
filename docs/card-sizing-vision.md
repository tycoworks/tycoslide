# Card & Content Sizing Vision

## The Problem

Content in tycoslide fills 100% of available vertical space. A three-card row with images balloons to occupy the entire slide body. The cards look inflated rather than elegant. This is a general problem — any component whose natural content height exceeds the available space will be shrunk to exactly fit, leaving zero breathing room.

**Concrete symptoms (showcase slides 4 & 5):**
- Cards stretch to fill the full body height (~3.7" after header/margins)
- Portrait images get surrounded by dead whitespace inside cards
- Small icon images (64×64 px) get the same card height as large illustrations
- Cards feel like walls, not content objects floating in space

## Design Principles

These principles come from established layout and typography systems.

### 1. Content Hugging (Apple Human Interface Guidelines)

Elements should resist expanding beyond their intrinsic content size. A card with a 200×150px image and two lines of text should be exactly that tall, plus padding — not inflated to fill a 3.7" container.

### 2. Whitespace Distribution (TeX Badness Model)

TeX penalizes layout "looseness" cubically: `badness = 100r³`, where `r` is the stretch ratio. This means:
- Small amounts of distributed whitespace (between cards via SPACE_EVENLY) look fine
- Large amounts of whitespace stuffed inside cards looks terrible

**The whitespace should be between cards, not inside them.**

### 3. The 60/40 Rule (Golden Ratio)

Content should occupy roughly 60-65% of available space, with 35-40% as breathing room. When content fills 100% of the body, there's no breathing room. SPACE_EVENLY handles this naturally — but only if children report a reasonable content height.

### 4. Material Design Card Patterns

Cards are "surfaces that display content and actions on a single topic." They are content-sized containers with consistent internal padding, not space-filling blocks.

### 5. Discrete Sizing

Given fixed text sizes (fontSize 12, 14, 18, 20) and fixed line heights, cards already land on a discrete set of heights. This is natural — we don't need to engineer discrete sizes.

## The Vision

**Content should be honestly sized, and the layout should manage whitespace.**

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

## Completed: Text preservation via flexShrink

### The problem

`applySlideDefaults()` sets `flexShrink: 1` on every Yoga node so children shrink to fit the slide. But this means all children shrink at equal rates. In a card with image + title + description, text gets crushed proportionally alongside the image.

A previous fix (`flex: 1` on the card image) masked this by setting the image's flex basis to 0 — the image contributed nothing to measurement, then expanded to fill all remaining space during layout. This "fixed" text crushing but made cards as tall as their container.

### The fix (implemented)

Added `flexShrink` as a `BoxProps` property. Card text boxes now have `flexShrink: 0` — they refuse to shrink. The image keeps the default `flexShrink: 1` from `applySlideDefaults`. Since the image is the only child that *can* shrink, it absorbs 100% of any shrinkage. No magic numbers, no tuning.

```typescript
// Image: content-sized, default flexShrink:1 absorbs all shrinkage
children.push(box({ content: new Image(this.theme, this.props.image) }));

// Title: won't shrink — text is always preserved
children.push(box({ flexShrink: 0, content: new Text(...) }));

// Description: won't shrink — text is always preserved
children.push(box({ flexShrink: 0, content: new Text(...) }));
```

This is a hard constraint (text never shrinks) rather than a soft ratio (image shrinks more). It's deterministic regardless of child count or sizes.

### Status

- `flexShrink` prop added to `BoxProps` in `box.ts`
- `flex: 1` removed from card image box
- `flexShrink: 0` added to card title and description boxes
- Test added: "flexShrink:0 protects child from shrinkage, sibling absorbs all"
- All 62 tests pass
- Text is no longer crushed in any card layout

## Remaining Problem: Content exceeds available space

The text preservation fix works, but cards are still full-height. This is because the images' natural DPI-capped heights are enormous:

| Image | Pixels | At card width | Natural height |
|-------|--------|---------------|----------------|
| Portrait illustration | 1436×1624 | 4.19" | **4.74"** |
| Landscape illustration | 1244×1043 | 4.19" | **3.52"** |
| Square illustration | 651×622 | 2.67" | **2.55"** |

The slide body is only ~3.8". A card with a 4.74" image plus text totals ~6". Yoga shrinks it to fit the available space (text protected, image absorbs shrinkage). The result: the card fills exactly 100% of its container. There's no whitespace to distribute.

**This is not a card-specific problem.** A bare image on a slide would behave identically — it reports 4.7" of natural height, gets shrunk to 3.8", fills the body.

### The general problem

The system has no concept of "this is too much content for this space, so request less." Every component reports its full natural height honestly. When natural height exceeds the container, shrinking produces a layout that fills 100% — no breathing room.

The missing piece is at the layout level, not the component level. Components report honest content heights. The layout should decide how much space to allocate.

## Next Step: Layout-level content budgeting

The slide body uses `SPACE_EVENLY` to distribute whitespace around children. But when children are taller than the body, SPACE_EVENLY can't add whitespace — there's nothing left to distribute.

The layout needs a way to say: "children, you have a budget. Don't request more than your fair share."

### Possible approaches

**Option A: maxHeight on the body column's children**

The SPACE_EVENLY column could cap each child's height at `bodyHeight / N * contentRatio` where N is the child count and contentRatio is ~0.6-0.7. This is explicit but requires the layout to know about content budgeting.

**Option B: A new justify mode (SPACE_EVENLY_CAPPED)**

Like SPACE_EVENLY but with built-in content budgeting. Each child gets at most `bodyHeight * contentRatio / N` of main-axis space. Remaining space becomes the SPACE_EVENLY gutters.

**Option C: Slide-level height budget propagation**

The slide knows its total height. It could compute a height budget for the body, and the body could propagate per-child budgets. This is the most general but also the most complex.

**Option D: Image self-capping relative to container**

Images could be aware of their context and self-cap. But this breaks the clean "getHeight answers one question" model — components would need to know about their container.

### Recommendation

Option A is the simplest and most transparent. The layout template (e.g., `cardSlide`) knows it has N cards in a body. It can compute a reasonable maxHeight for the card row. This doesn't require any framework changes — just smarter use of existing `maxHeight` in the layout factories.

The key insight: **the layout template is where the knowledge lives** — it knows the slide structure, the number of children, and the intent. The components shouldn't need to know about the slide. The framework shouldn't impose opinions. The layout template bridges the two.

### Open questions

1. Should maxHeight be computed per-template (e.g., `cardSlide` calculates it) or should `contentSlide` compute it generically for all its children?
2. How does this interact with rows of cards where the row has equal-flex children? The row's height is what matters, not individual card heights.
3. What's the right content ratio? 60%? 70%? Should it be a theme constant?
