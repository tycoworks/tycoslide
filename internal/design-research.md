# Design Research: Content Density & Spacing

Raw research findings. No decisions — see architecture.md for decided patterns.

## Content Density & Fill Ratios

### Material Design

- Uses absolute values (8dp grid), NOT percentage-based fill ratios
- Base grid: 8dp for all components
- Margins: 8, 16, 24, or 40dp
- Card padding: 16dp bottom (with actions), 24dp bottom (without)
- Density levels: Default (0), Comfortable (-1), Compact (-2, -3) — each reduces height by 4px
- Sources: m3.material.io/components/cards/guidelines, m1.material.io/layout/metrics-keylines.html

### Apple Human Interface Guidelines

- 8-point grid system (multiples of 8px)
- Minimum touch targets: 44 × 44 points
- "Generous whitespace" as part of premium feel
- No specific percentage ratios
- Source: developer.apple.com/design/human-interface-guidelines/layout

### General Layout Design

- 30-50% whitespace recommended (50-70% content fill)
- Source: LinkedIn design advice on whitespace ratios

### Presentation Design

- ~33% content / 67% whitespace for professional slides
- Rule of Thirds: 3×3 grid, content at intersection points
- Source: inknarrates.com/post/whitespace-in-presentations

### Golden Ratio

- 62/38 split for asymmetric layouts
- Line height: 1.618 × font size
- Applied to margins, padding, content-to-whitespace proportions
- Sources: nngroup.com/articles/golden-ratio-ui-design/

### Tufte: Data-Ink Ratio

- Data-ink ratio = data-ink / total ink, goal: approach 1.0
- Minimize non-data ink (decorative elements)
- Research shows mixed results — some users prefer more visual context
- Source: infovis-wiki.net/wiki/Data-Ink_Ratio

### Key Finding

No authoritative "the number is 65%" exists. The range depends on context:

- Presentations: 33% content (aggressive whitespace)
- General layouts: 50-70% content
- Golden ratio: 62% content
- Material Design: doesn't use percentages at all

## Spacing Hierarchy Patterns

### Tailwind CSS

- Fixed numeric scale: 0.25rem base unit
- Completely explicit — every spacing decision is manual
- No automatic inference
- Semantic naming only through custom config

### Chakra UI

- Two-layer system: base tokens → semantic tokens
- Base tokens: spacing.2 = 0.5rem, spacing.4 = 1rem
- Semantic tokens: spacing.component-gap → {spacing.2}
- No automatic inference, but semantic names encode intent

### Material UI

- theme.spacing() function with 8px base multiplier
- theme.spacing(1) = 8px, theme.spacing(2) = 16px
- No automatic inference — components choose their multipliers

### Gestalt Proximity Principle

- Items closer together = perceived as grouped
- Internal spacing < External spacing (padding < margins)
- Qualitative, not quantitative — no specific ratios recommended
- Source: nngroup.com/articles/gestalt-proximity/

### Proximity-Based Hierarchy (common pattern)

- 4px: associated (icon next to label within button)
- 8px: related (items in a card, form fields in a group)
- 16px: separated (between distinct components)
- 32px: section boundaries (major structural divisions)

### Gap Automation Approaches (from design systems)

- **Explicit helpers**: Named wrappers encoding intent (tight/spaced) — zero magic
- **Semantic tokens**: Named tokens encoding relationship (RELATED/STRUCTURAL) — zero magic
- **Auto-inference from component types**: Detect leaf vs container children — HIGH magic, fragile, breaks when refactoring

### Key Finding

No major design system auto-infers spacing from component context. All use explicit specification with varying levels of semantic naming. Gestalt proximity is qualitative — "closer = grouped" — without prescribing specific ratios.

## Prior Art in tycoslide

### contentBudget (deprecated)

The old Box/Yoga system had `contentBudget: 0.65` — a property that capped content at 65% of available space. This was removed during the grid migration (Phase 1-4) without a replacement.

From card-sizing-vision.md (line 174):

```typescript
column([0, 1], [header, column({ contentBudget: 0.65, justify: SPACE_EVENLY }, intro, row(cards))])
```

### Open Question (card-sizing-vision.md line 197)

> Breathing room mechanism — Without contentBudget, how does the grid ensure ~35% whitespace? Options: (a) the grid spec itself defines the content area as a fraction of bounds, (b) splitV with a measured content region and the remainder is whitespace, (c) leave it to template authors to size the grid appropriately.

This question was never resolved.

## Information Density Research

- No universal optimal percentage exists
- Optimal density varies by: user type (expert vs novice), cultural context, application domain
- High-density interfaces fail when visual hierarchy is poor
- Sources: nngroup.com/topic/information-density/, logrocket.com

## Card Aspect Ratio Research (2026-02)

### Professional Card Aspect Ratios

Research indicates optimal card aspect ratios fall in the **1.2 to 1.6 range**:

| Ratio | Name | Notes |
|-------|------|-------|
| 1.33 | 4:3 | Classic presentation ratio |
| 1.50 | 3:2 | Photography standard |
| 1.618 | Golden ratio | Aesthetically pleasing |

Cards outside this range feel either:
- **Too square** (< 1.2): Cramped, boxy
- **Too wide/flat** (> 1.8): Stretched, empty

### Inset vs Full-Width Observations

User testing observations:

| Layout | Observation | Hypothesis |
|--------|-------------|------------|
| 3 cards, 1 row | Inset looks good | Sparse layouts benefit from visual boundary |
| 2×2 grid | Full width looks better | Dense grids are self-grouping |
| 3×2 grid | Full width looks better | Multi-row layouts have internal structure |

**Two factors at play:**

1. **Aspect Ratio**: Fewer cards → wider individual cards → inset keeps them in elegant proportions
2. **Edge Tension (Gestalt)**: Dense grids with consistent internal spacing are self-grouping; the eye perceives them as a unit without needing external padding

### Future: Smart Layout System

**Auto-Grid Detection** — Instead of requiring explicit column count, system could auto-detect optimal layout:

```typescript
// Future API
group(card1, card2, card3, card4, card5, card6)  // System determines 3×2 is optimal
```

Heuristics for auto-detection:
- Available width / target aspect ratio = ideal columns
- Prefer layouts where cards land in 1.2-1.6 aspect ratio
- Prefer fewer rows when aspect ratios are acceptable
- Consider total item count (6 → 3×2 or 2×3, prefer wider)

**Aspect-Ratio-Preserving Inset** — Instead of fixed padding, calculate inset to achieve target aspect ratio:

```typescript
// Future API
group(row(card1, card2, card3), { aspectRatio: 1.5 })
```

**Global Design System** — Configuration at theme level:

```typescript
theme.design = {
  targetCardAspectRatio: 1.5,      // Golden-ish
  preferInsetForSparseLayouts: true,
  maxCardsPerRow: 4,
  gridGap: 0.25,
}
```

### Current Implementation (v1)

For now, `group()` provides:

1. **Single component mode**: `group(component)` — wraps with optional padding (default: off)
2. **Grid mode**: `group(columns, ...items)` — auto-arranges into rows

Padding defaults to **off** (0). Users can explicitly add padding:
```typescript
group(component, 0.25)  // Explicit 0.25" padding
```

The grid mode creates structure but does not auto-inset. This keeps behavior predictable while we develop smarter layout algorithms.
