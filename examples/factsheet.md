---
theme: "@tycoslide/theme-default"
format: factsheet
---

---
layout: body
variant: default
title: "Presentations as code for teams"
---

Design tools require specialized skills. Slide templates drift from brand guidelines within weeks. Manual formatting consumes hours that should be spent on messaging. tycoslide eliminates this bottleneck by treating **presentations as code**.

:::quote{attribution="The tycoslide approach"}
One theme, many formats. A single TypeScript theme package produces presentations, fact sheets, and battle cards -- all sharing the same brand tokens, typography, and color palette.
:::

Authors write content in markdown, themes enforce brand consistency through design tokens, and CI/CD pipelines produce pixel-perfect PowerPoint files on every commit.

## Deterministic output

Every build produces byte-identical results. No font substitution, no layout drift. Content is measured in actual rendered pixels, then placed with sub-point precision into PowerPoint's coordinate system.

## Theme-driven design

Themes are TypeScript packages built on W3C design token principles. A single palette, typography scale, and spacing grid powers every format. Brand updates propagate instantly across every deck in the organization.

## Editable PPTX

Output is native PowerPoint with real text runs, grouped shapes, and proper slide masters. Recipients can edit text, reposition elements, and add slides -- no re-export from images.

---
layout: cards
variant: default
title: "Three ways to use tycoslide"
cards:
  - title: Author
    description: Write slides in markdown with directives for layout components — cards, quotes, tables, code blocks, and images. No design tools required. Content authors focus on messaging while the theme handles visual consistency.
  - title: Theme
    description: Build themes in TypeScript with design tokens. Define a palette, typography scale, and component styles once. A single theme powers presentations, fact sheets, and battle cards through format-specific configurations.
  - title: Distribute
    description: Build slides in CI/CD pipelines. Version control your content alongside your code. Ship consistent, on-brand decks across your entire organization with every merge to main.
---
