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
