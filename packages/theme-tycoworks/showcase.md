---
theme: @tycoworks/tycoslide-theme
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
image: $tycoworks.tycoslide
items:
  - What it is
  - How it compares
  - How it works
notes: "Agenda layout — three numbered items with background cards."
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
title: Capabilities
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
variant: centered
title: How It Works
notes: Mermaid diagram — the build process from markdown to PowerPoint. Horizontal flow throughout.
---

:::mermaid
flowchart LR
  MD("Markdown +<br/>YAML Frontmatter") -.-> BUILD
  TS("TypeScript Tokens<br/>+ Components") -.-> BUILD
  subgraph BUILD ["Build Engine"]
    direction LR
    PARSE("<b>Parse<br/>Markdown</b>") --> EXPAND("<b>Render<br/>Components</b>") --> MEASURE("<b>Measure<br/>Layout</b>")
  end
  BUILD -.-> PPTX("Native, Editable<br/>PowerPoint")
  class PARSE,EXPAND,MEASURE purple
:::

---
layout: end
variant: default
title: tycoslide
notes: Closing slide.
---
