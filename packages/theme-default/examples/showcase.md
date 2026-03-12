---
theme: tycoslide-theme-default
---

---
layout: title
variant: default
title: tycoslide
subtitle: Build presentations like software.
notes: Opening slide.
---

---
layout: agenda
variant: default
title: Agenda
eyebrow: Overview
items:
  - What is tycoslide?
  - Editable PowerPoint slides
  - Pure TypeScript themes
  - Build-time validation
  - Roadmap and next steps
notes: Agenda layout — items render as a native bullet list via the list component.
---

---
layout: statement
title: What is tycoslide?
eyebrow: The Product
body: "A presentation :purple[**build tool**] that generates :purple[**editable PowerPoint slides**] from markdown, with :purple[**TypeScript-based themes**] and :purple[**build-time validation**]."
variant: hero
caption: PowerPoint for compatibility. TypeScript for themes. Validation for correctness.
notes: Functional description from positioning framework. One sentence, four anchors.
---

---
layout: comparison
variant: default
title: The Tradeoff
eyebrow: Problem
leftTitle: Brand Compliance
rightTitle: Developer Velocity
notes: Sequoia problem slide. Frames the gap without naming or criticizing specific tools.
---

::left::

Manual brand management in GUI tools. Native file output, full visual control.

- Brand guidelines exist as PDFs
- Every update is manual across every deck
- No version control, no automation
- Works in every boardroom

::right::

Code-first authoring with developer workflows. Fast iteration, full automation.

- Markdown, version control, CI/CD
- Web-only output (HTML, PDF)
- Limited or no layout control
- Incompatible with corporate PowerPoint workflows

---
layout: cards
title: Three Pillars
eyebrow: Solution
cards:
  - title: Editable PowerPoint Slides
    description: Native PowerPoint slides that can be opened and edited in any presentation software.
    image: $icons.rocket
  - title: Pure TypeScript Themes
    description: Pure TypeScript for design tokens, components, and layouts — no CSS, no HTML templates.
    image: $icons.editNote
  - title: Build-Time Validation
    description: Catches layout overflows, missing tokens, and invalid parameters at build time.
    image: $icons.shield
variant: flat
notes: Three pillars from positioning framework. Each maps to one supporting argument.
---

---
layout: image-right
variant: default
title: Editable PowerPoint Slides
eyebrow: Pillar 1
image: $icons.rocket
notes: |
  Supporting argument 1. Native PowerPoint compatibility.

  IMAGE BRIEF: A realistic laptop (MacBook-style, silver) open at a slight angle showing Microsoft PowerPoint with a professional presentation slide on screen. The slide visible in PowerPoint has a navy header bar, white body with a bar chart and bullet points — clearly a real editable deck, not an image export. A text cursor is visible in one of the text boxes, and the PowerPoint ribbon toolbar is showing at the top with formatting options. The overall feel is "this is a real, native, editable file." Warm lighting, shallow depth of field on the laptop edges. Editorial product photography style — clean desk surface, minimal background. Aspect ratio roughly 1:1 or 4:5 (portrait-leaning).
---

The output works everywhere PowerPoint does — boardrooms, laptops, email attachments, SharePoint.

- Native .pptx files — Real text, shapes, and tables. Not images, not HTML, not screenshots.
- Universal compatibility — Opens in PowerPoint, Keynote, Google Slides, and LibreOffice.
- Field-editable output — Generated deck is the 80% baseline. Sales reps own the last 20%.

---
layout: image-left
variant: default
title: Pure TypeScript Themes
eyebrow: Pillar 2
image: $icons.editNote
notes: |
  Supporting argument 2. TypeScript-based theming.

  IMAGE BRIEF: A dark code editor (VS Code aesthetic) with a TypeScript file open showing a theme definition — visible token declarations for colors (hex values like #0A2540, #FFFFFF), font families, and spacing values. The file is clearly named "theme.ts" in the editor tab. Below the token declarations, a component definition with typed parameters. On the right side of the editor, a preview panel shows three slides that all share the same navy/white color scheme — demonstrating tokens applied consistently. Color palette: deep navy (#0A2540) background, syntax highlighting in cool blues, greens, and warm ambers. No OS window chrome — just the editor content. Flat, clean, developer-tool aesthetic. Aspect ratio roughly 1:1 or 4:5 (portrait-leaning).
---

Themes, components, and layouts are pure TypeScript — no CSS, no HTML templates, no separate design tooling.

- One language — Colors, typography, spacing, components, and layouts all defined in TypeScript. Type-checked end to end.
- Token system — Design values defined once and resolved everywhere. Every deck draws from the same source.
- Clear ownership — Designers own tokens, developers own layouts, authors own content.

---
layout: image-right
variant: default
title: Build-Time Validation
eyebrow: Pillar 3
image: $icons.shield
notes: |
  Supporting argument 3. Compile-time correctness.

  IMAGE BRIEF: A clean terminal interface showing a tycoslide build output. Three sections visible: (1) a green checkmark line reading "12 slides parsed," (2) a red error block with a clear message like "Layout overflow: text exceeds container bounds on slide 7" with the offending line highlighted, and (3) a yellow warning "Missing token: accentColor not defined in theme." The terminal has a dark background (#0A2540) with colored output — green for pass, red (#B42318) for errors, amber for warnings. Below the terminal, a small "before/after" showing a broken slide (text overflowing its box) next to a corrected version. Flat vector illustration style. Clean geometric shapes, no gradients. Aspect ratio roughly 1:1 or 4:5 (portrait-leaning).
---

Layout overflows, missing tokens, and invalid parameters surface at build time — not after the deck ships.

- Validated layouts — Content that exceeds its container produces a build error, not a clipped slide.
- Token resolution — Missing or mistyped tokens fail the build. No silent fallbacks, no blank fields.
- Parameter checking — Invalid component parameters caught before rendering. Schema errors are compile errors.

---
layout: body
variant: default
title: How It Works
eyebrow: Architecture
notes: Technical flow from authored content to native PowerPoint output. Each stage is a discrete, testable pipeline step.
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
title: Presentations as Code
eyebrow: Code Component
notes: Demonstrates syntax-highlighted code blocks. The code component renders to PNG, themed entirely through design tokens.
---

```typescript
import { presentation, contentSlide } from 'tycoslide';
import { text, code, row } from 'tycoslide-components';

const pres = presentation('my-theme');

pres.add(contentSlide('API Example',
  row(
    text('Query all active orders:'),
    code(`SELECT * FROM orders
WHERE status = 'active'
ORDER BY created_at DESC;`, 'sql'),
  ),
));

await pres.build('output.pptx');
```

---
layout: body
variant: default
title: Rich Text Formatting
eyebrow: Inline Styles
notes: Demonstrates all inline text formatting options available.
---

tycoslide supports a full range of inline formatting:

- **Bold text** and *italic text* for emphasis
- [Hyperlinks](https://example.com) with theme-controlled color and underline
- ~~Strikethrough~~ for deletions or corrections
- ++Underline++ for additional emphasis
- :purple[Accent colors] via text directives
- Composable: [**~~bold struck link~~**](https://example.com)

---
layout: body
variant: default
title: Where tycoslide Fits
eyebrow: Landscape
notes: Factual comparison. No judgement — dimensions and facts. The audience draws their own conclusion.
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
layout: cards
variant: default
title: Roadmap
eyebrow: Vision
cards:
  - title: On Brand
    description: Design tokens define visual identity — colors, fonts, spacing, layouts. Theme-as-code is the foundation. Available today.
    image: $icons.palette
  - title: On Message
    description: Field guide in the theme. Content tokens with tiered messaging. Drift detection flags stale claims. A linter for marketing content.
    image: $icons.lightbulb
  - title: Content Infrastructure
    description: Dependency graph tracks what depends on what. Change positioning once, every asset rebuilds. Terraform for product marketing.
    image: $icons.accountTree
notes: "Three phases: brand compliance (now) → messaging governance (next) → full content infrastructure (vision)."
---

---
layout: quote
variant: default
quote: The best presentations are built like software — version-controlled, token-driven, and repeatable.
attribution: — The tycoslide manifesto
notes: Pull quote component. Left accent bar, large text, optional attribution. This is the default rendering for markdown blockquotes.
---

---
layout: body
variant: default
title: Customer Testimonial
eyebrow: Testimonial Component
notes: Card-style testimonial with background, border, and optional image. Use for customer stories, endorsements, and social proof.
---

:::testimonial{quote="tycoslide replaced our entire manual slide workflow. What used to take a designer two days now runs in CI in under a minute." attribution="— Jamie Chen, Head of Product Marketing"}
:::

---
layout: body
variant: default
title: Text Wrapping Edge Case
eyebrow: QA
notes: |
  Reproduces a known text wrapping discrepancy. "The persistence is the skill."
  wraps "skill." to line 2 in Keynote/Slides/PowerPoint but fits on one line
  in Chromium. See internal/text-wrapping-research.md.
---

*"You mentioned applications earlier — let's talk about what those need."* The persistence is the skill. *"You mentioned applications earlier — let's talk about what those need."* The persistence is the skill. *"You mentioned applications earlier — let's talk about what those need."* The persistence is the skill.

---
layout: end
variant: default
title: tycoslide
subtitle: Build presentations like software.
notes: Closing slide. Mirrors the title.
---
