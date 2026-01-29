# Adaptive layout spacing

## Completed

- Box refactor + width/height/maxHeight props
- Card.getMaximumHeight delegates to getBox()
- Theme constructor injection
- Structural tidy-up (DSL module, Box to core, lowercase files)
- Box caching in RowLayout/ColumnLayout
- Image returns natural height (`width / aspectRatio`)
- ImageProps.fixed removed (layout uses `box({ maxHeight })` instead)
- contentSlide expansion check: `theme.slide.width` → `Infinity`
- Remove content-driven mode from RowLayout + row unit tests

---

## The problem

Cards in rows fill all available space. A row of 3 cards on a slide with ~3.5" of vertical space stretches each card to 3.5" tall, even though the content (image + title + description) only needs ~2.5". No breathing room.

## Design principle

**Components know their natural size. The layout respects it.**

Every component already reports `getMaximumHeight(width)` — the largest it could usefully be. Images return their natural height at a given width. Text returns its line height. Cards return image + text + padding.

The problem is that RowLayout ignores this information. It wraps each child in `box({ flex, content })` with no height constraint, so Yoga stretches everything to fill. The fix: **cap each child's wrapping box at the child's actual maxHeight, and center it in the remaining space.**

## How it works

RowLayout.getBox(width) computes each child's actual width from flex proportions, then queries `child.getMaximumHeight(childWidth)` to get the natural maximum. Children that have room to breathe (maxH > minH) get a centering wrapper:

```
┌─── flex cell (full row height) ─────┐
│          (empty space)              │
│  ┌─── maxHeight cap ────────────┐   │
│  │  card content at natural     │   │
│  │  size (image + text)         │   │
│  └──────────────────────────────┘   │
│          (empty space)              │
└─────────────────────────────────────┘
```

The outer box fills the flex allocation. The inner box is capped at the card's natural maximum height and centered vertically (`justify: center`). The card draws within the inner box at its natural size.

Children without a meaningful size range (maxH ≈ minH, e.g. text-only cards) skip the cap and stretch to fill as before — a text card with a large background and centered text looks intentional.

## Why it's adaptive

- **No configuration**: maxHeight is computed from actual content at actual width. No padding values to set.
- **Content-aware**: a card with a tall image gets more height than one with a short image.
- **Space-responsive**: if you add a text line above the cards, the row gets less space. The caps still apply, but the centering space shrinks proportionally. If space gets tight enough that caps exceed available height, Yoga simply fills the space (same as today).
- **Tied to justify**: `contentSlide` uses `SPACE_EVENLY` to distribute space between elements. When rows report honest max heights (finite, not Infinity), space-evenly distributes remaining space around the row. The centering within cells adds per-card breathing room. Both layers work together.

## Interaction with justify modes

- `space-evenly` / `space-between`: extra space exists between elements at the parent level. Rows with finite maxH benefit most — they get space AROUND them.
- `start` (default): no parent-level distribution. The centering within cells still creates per-card breathing room.
- The centering cells always work regardless of parent justify. Parent justify is a bonus.
