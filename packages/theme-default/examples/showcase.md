---
theme: tycoslide-theme-default
---

---
layout: title
variant: hero
title: tycoslide
subtitle: Build presentations like software.
image: $tycoworks.tycoslide
notes: Opening slide. White background with logo.
---

---
layout: agenda
variant: hero
title: Agenda
items:
  - 1. What is tycoslide?
  - 2. Three pillars
  - 3. Presentations as code
  - 4. Where tycoslide fits
  - 5. Roadmap
notes: Agenda layout — split variant with title left, items right, no footer.
---

---
layout: statement
title: What is tycoslide?
eyebrow: The Product
body: "A presentation :purple[**build tool**] that generates :purple[**editable PowerPoint slides**] from markdown, with :purple[**TypeScript-based themes**] and :purple[**build-time validation**]."
variant: hero
caption: PowerPoint for compatibility. TypeScript for themes. Validation for correctness.
notes: Positioning one-liner. Four anchors in one sentence.
---

---
layout: cards
variant: flat
title: Three Pillars
eyebrow: Solution
cards:
  - title: Editable PowerPoint Slides
    description: Native .pptx files that open and edit in PowerPoint, Keynote, and Google Slides.
    image: $icons.rocket
  - title: Pure TypeScript Themes
    description: Design tokens, components, and layouts defined in one language. Type-checked end to end.
    image: $icons.editNote
  - title: Build-Time Validation
    description: Layout overflows, missing tokens, and invalid parameters surface at build time.
    image: $icons.shield
notes: Three pillars from positioning framework. Each maps to one supporting argument.
---

---
layout: body
variant: default
title: Presentations as Code
eyebrow: How It Works
notes: Meta slide — the code block shows the markdown source for this very slide.
---

This is the markdown that generates the slide you are looking at:

```markdown
---
layout: body
variant: default
title: Presentations as Code
eyebrow: How It Works
---

This is the markdown that generates
the slide you are looking at.
```

tycoslide supports **bold**, *italic*, [links](https://tycoslide.com), ~~strikethrough~~, ++underline++, and :purple[accent colors].

---
layout: stat
variant: default
value: "0"
label: Silent Failures
caption: Layout overflows, missing tokens, and invalid parameters are caught at build time — not after the deck ships.
notes: Stat layout — big number with label and caption.
---

---
layout: two-column
variant: default
title: What You Write / What You Get
eyebrow: Workflow
notes: Two-column layout — markdown on left, description on right.
---

::left::

```markdown
---
layout: title
title: My Deck
subtitle: Built with tycoslide
---

---
layout: body
title: First Slide
eyebrow: INTRO
---

Your content goes here.
```

::right::

A `.pptx` file with native text boxes, shapes, and tables. Not images, not HTML, not screenshots.

- Opens in PowerPoint, Keynote, Google Slides
- Field-editable — generated deck is the 80% baseline
- Version-controlled markdown source
- Automated builds via CI/CD

---
layout: body
variant: default
title: Build Pipeline
eyebrow: Architecture
notes: Mermaid diagram — the build process from markdown to PowerPoint.
---

:::mermaid
flowchart LR
  MD["Markdown<br/>+ YAML"] --> PARSE["Parse"]
  TS["TypeScript<br/>DSL"] --> PARSE
  PARSE --> EXPAND["Expand<br/>Components"]
  EXPAND --> LAYOUT["Browser<br/>Layout"]
  LAYOUT --> RENDER["Build<br/>.pptx"]
  RENDER --> FILE[".pptx"]
  class PARSE,EXPAND,LAYOUT,RENDER primary
:::

---
layout: body
variant: default
title: Where tycoslide Fits
eyebrow: Landscape
notes: Comparison table. Dimensions and facts — the audience draws their own conclusion.
---

| | tycoslide | PowerPoint | Slidev / Marp | Gamma |
|---|---|---|---|---|
| Output | Editable .pptx | .pptx / .key | HTML / PDF | Web / PDF |
| Theme system | TypeScript tokens | Manual templates | CSS + HTML | AI-generated |
| Authoring | Markdown + TypeScript | GUI | Markdown | AI prompt |
| Version control | Git (text files) | Binary files | Git (text files) | Cloud history |
| Build validation | Overflows, tokens, params | None | None | None |
| Automation | CI/CD pipelines | VBA macros | Build scripts | API |

---
layout: quote
variant: default
quote: "Software is eating the world... especially presentations."
attribution: "— Marc Andreessen (probably)"
notes: Pull quote with left accent bar. He did not quite say that.
---

---
layout: end
variant: default
title: tycoslide
subtitle: Build presentations like software.
notes: Closing slide. Mirrors the title.
---
