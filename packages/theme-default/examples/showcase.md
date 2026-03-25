---
theme: tycoslide-theme-default
---

---
layout: title
variant: default
title: "**tycoslide**"
subtitle: "Build slides like software.:purple[▌]"
notes: Opening slide. Clean centered title with cursor.
---

---
layout: agenda
variant: default
title: Agenda
items:
  - What is tycoslide?
  - Markdown → PowerPoint
  - Key Features
  - How It Compares
  - How It Works
  - The Design System
notes: Agenda layout — six sections matching the narrative arc.
---

---
layout: statement
variant: default
body: "tycoslide is a :purple[**presentation build tool**] that generates :purple[**editable PowerPoint slides from markdown**], with :purple[**TypeScript-based themes**] and :purple[**build-time validation**]."
notes: Positioning one-liner. Four anchors in one sentence.
---

---
layout: transform
variant: default
title: "Markdown → PowerPoint"
notes: Side-by-side showing markdown input on the left and the resulting slide output on the right.
---

::left::

review.md

```markdown
---
layout: body
---

# Q3 Infrastructure Review

The new pipeline *increased*
throughput by **40%** with
:purple[zero downtime].
```

::right::

review.pptx

:::card{title="Q3 Infrastructure Review" description="The new pipeline *increased* throughput by **40%** with :purple[zero downtime]."}
:::

::overlay::

![redo]($icons.redo)

---
layout: cards
variant: default
title: Key Features
cards:
  - title: Editable PowerPoint Slides
    description: Native PowerPoint slides that can be edited in any presentation software.
    image: $icons.description
  - title: Pure TypeScript Themes
    description: Pure TypeScript for design tokens, components, and layouts — no CSS needed.
    image: $icons.palette
  - title: Build-Time Validation
    description: Catches layout overflows, missing tokens, and invalid parameters at build time.
    image: $icons.shield
notes: Three pillars from positioning framework. Each maps to one supporting argument.
---

---
layout: body
variant: centered
title: How It Compares
notes: Comparison table with tycoslide column highlighted. The audience sees "None" for build validation in every competitor.
---

:::table
| | :purple[**tycoslide**] | Slidev | Marp | Reveal.js |
|---|---|---|---|---|
| Output | :purple[.pptx (editable)] | HTML, PDF, .pptx (images) | PDF, HTML, .pptx (images) | HTML, PDF |
| Components | :purple[TypeScript] | Vue | Markdown-It | JavaScript |
| Design tokens | :purple[TypeScript] | CSS | CSS | CSS |
| Validation | :purple[Build-time] | None | None | None |
| Preview | :purple[Static] | Live | Live | Live |
:::

---
layout: body
variant: default
title: How It Works
notes: Mermaid diagram — the build process from markdown to PowerPoint. Vertical flow inside the Build Engine subgraph.
---

:::mermaid
flowchart LR
  MD["Markdown +<br/>YAML Frontmatter"] -.-> BUILD
  TS["TypeScript Theme<br/>(Tokens & Components)"] -.-> BUILD
  subgraph BUILD ["Build Engine"]
    direction TB
    PARSE["Parse<br/>Markdown"] --> EXPAND["Expand<br/>Components"] --> MEASURE["Measure Layout<br/>(Browser)"]
  end
  BUILD --> PPTX["Native, Editable<br/>PowerPoint"]
  class PARSE,EXPAND,MEASURE primary
:::

---
layout: stat
variant: default
value: "Zero"
label: Silent Failures
caption: Catch layout overflows, missing design tokens, and invalid parameters at build time. Presentations are finally treated with the same rigorous QA as production software.
notes: Lands after the pipeline explains HOW. The proof point — zero silent failures.
---

---
layout: quote
variant: dark
quote: "Software is eating the world...especially presentations."
attribution: "— Marc Andreessen (probably)"
notes: Dark pull quote — emotional beat and visual contrast before the design system section.
---

---
layout: section
variant: default
title: Design System
notes: Section divider before the design system slides. Dark background with centered title.
---

---
layout: shapes
variant: default
title: Color Palette
subtitle: Approved brand colors
notes: Four key palette colors rendered as swatches with role names and hex values.
---

---
layout: body
variant: default
title: Typography
notes: Font hierarchy — Inter font family at different weights and sizes.
---

## Inter Bold — Display Heading

### Inter Bold — Section Heading

#### Inter Bold — Card Heading

The default body text is set in **Inter Regular** at 16pt. Inline styles include **bold**, *italic*, ++underline++, ~~strikethrough~~, and :purple[accent colors].

`Inter Light` is used for subtitles and captions, set at a lighter weight for visual hierarchy.

---
layout: end
variant: default
title: tycoslide
subtitle: Build presentations like software
notes: Closing slide. Mirrors the title. Light background contrasts with the dark quote.
---
