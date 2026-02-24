# tycoslide Positioning Framework

A 6-slide positioning framework following the Fletch methodology, designed to clearly communicate tycoslide's unique value proposition in the presentation tooling market.

---

## Slide 1: Functional Description

**tycoslide is a presentation build tool that helps developers and marketing ops teams in B2B software companies generate native PowerPoint decks from markdown and TypeScript, with enforced brand compliance through design tokens.**

### Anchors Analysis:
- **Category Anchor**: "presentation build tool" — positions us in the developer tooling/build systems category, not traditional presentation software
- **Use Case Anchor**: "generate native PowerPoint decks from markdown and TypeScript" — the core functional capability
- **Persona Anchor**: "developers and marketing ops teams" — bridges technical and business personas
- **Company Anchor**: "B2B software companies" — specific segment with brand compliance needs

---

## Slide 2: Problem Framing

**Other presentation tools force you to choose between brand compliance and development velocity. Design tools like PowerPoint require manual enforcement of brand guidelines (slow, error-prone), while code-first tools like Slidev produce web slides that don't work in corporate environments where PowerPoint is the standard.**

### Problem Elements:
- **Reference Point**: Other presentation tools (both traditional and modern)
- **Core Problem**: False choice between compliance and velocity
- **Pain Point 1**: Manual tools (PowerPoint/Keynote) = manual brand enforcement = breaks easily
- **Pain Point 2**: Modern tools (Slidev/Reveal.js) = web-only output = incompatible with corporate workflows
- **Pain Point 3**: Markdown converters (Marp/Pandoc) = limited layout control or non-editable output

---

## Slide 3: Value Framing

**tycoslide is a presentation build tool designed from the ground up to enforce brand compliance at compile time while generating native PowerPoint files. You get the velocity of markdown and the safety of type-checked design tokens, without sacrificing PowerPoint compatibility.**

### Value Summary:
- Brand compliance becomes a **build error**, not a process problem
- Markdown/TypeScript authoring for **developer velocity**
- Native .pptx output for **corporate compatibility**
- Design token system ensures **single source of truth**

---

## Slide 4: Supporting Argument 1

### **Presentations as Code**

Unlike traditional presentation tools that require working in a GUI with manual processes, tycoslide treats presentations as code with markdown authoring, TypeScript automation, and automated pipeline integration.

#### Features:
- **Markdown authoring** — Write slides like documentation, version control in Git
- **TypeScript DSL** — Programmatic slide generation with full type safety
- **Automated pipelines** — Build decks in CI/CD with fail-fast validation for missing tokens, invalid layouts, and content overflow

**The coin**: Developer workflow automation — all three features enable treating presentations as build artifacts rather than manual documents.

---

## Slide 5: Supporting Argument 2

### **Brand Compliance**

Unlike other tools that treat brand guidelines as documentation (easily ignored), tycoslide encodes brand rules in design tokens and theme files. Invalid designs fail the build before they ship.

#### Features:
- **Design token system** — W3C DTCG-aligned tokens for colors, typography, spacing as single source of truth
- **Type-safe token resolution** — Missing or invalid tokens = compile error, not runtime surprises
- **Component boundaries** — Pre-approved layouts and components enforce persona separation (designers control tokens, developers control layouts, authors control content)

**The coin**: Compile-time brand enforcement — all three features ensure brand violations are build errors, not process failures.

---

## Slide 6: Supporting Argument 3

### **PowerPoint Output**

Unlike web-based tools (Slidev, Reveal.js) that only run in browsers or converters (Marp) that embed images, tycoslide generates real, editable PowerPoint objects with precise control over positioning and layout.

#### Features:
- **Editable .pptx files** — Output works offline in PowerPoint, Keynote, LibreOffice without web viewers
- **Measured layout engine** — CSS flexbox via Playwright for precise, reproducible positioning
- **Native PowerPoint objects** — Real shapes, text, tables, and diagrams (not images or HTML conversion) with component primitives for cards, grids, and layouts

**The coin**: Native PowerPoint compatibility — all three features ensure output works seamlessly in corporate presentation workflows.

---

## Analysis: Feature Grouping Strategy

### Why These Three Themes?

The positioning organizes tycoslide's features into three themes that address distinct buying concerns for the target audience:

#### 1. **Presentations as Code** (Velocity)
- **Business Problem**: Marketing teams struggle with slow iteration cycles when using traditional presentation tools
- **The Coin**: Developer workflow automation — markdown authoring, TypeScript DSL, and automated pipelines work together to treat presentations as build artifacts
- **Core Features**: Text-based authoring (markdown), programmatic generation (TypeScript), and automated validation (CI/CD)
- **Buyer Concern**: "Will this actually be faster than PowerPoint?"
- **Unique Angle**: We're the only presentation tool that treats slides like code artifacts with full build system integration

#### 2. **Brand Compliance** (Safety)
- **Business Problem**: Brand guidelines exist as PDFs but presentations still break them
- **The Coin**: Compile-time brand enforcement — design tokens, type safety, and component boundaries work together to make violations impossible
- **Core Features**: Centralized token system, compile-time validation, and enforced component boundaries
- **Buyer Concern**: "How do we prevent brand violations at scale?"
- **Unique Angle**: We're the only tool where brand compliance is a compile-time guarantee, not a process problem

#### 3. **PowerPoint Output** (Compatibility)
- **Business Problem**: Corporate environments require PowerPoint, web tools don't work
- **The Coin**: Native PowerPoint compatibility — editable files, measured layouts, and native objects work together to integrate with corporate workflows
- **Core Features**: Editable .pptx output, precise layout engine, and native PowerPoint primitives
- **Buyer Concern**: "Can our sales team actually use this in their workflow?"
- **Unique Angle**: We're the only code-first tool that produces native, editable PowerPoint with precise layout control

### Features Deliberately Left Out:

Some features support the themes but aren't listed as bullet points:
- **Extensible component system** — Supports "Enforced Brand Compliance" theme but is too technical for positioning
- **Three-persona model** — Supports "Enforced Brand Compliance" but is a workflow concept, not a feature
- **Mermaid diagrams** — Cool feature but not critical to core positioning

---

## Rationale: Problem & Value Framing

### Why This Problem Framing?

The problem is framed as a **false choice** rather than a missing feature:

- **Traditional presentation tools** (PowerPoint, Keynote) have brand compliance issues because enforcement is manual
- **Modern code-first tools** (Slidev, Reveal.js) solve velocity but produce web slides that don't work in corporate environments
- **Markdown converters** (Marp, Pandoc) are close but either produce non-editable output or lack layout control

This framing positions tycoslide as **the first tool to solve both sides** rather than just "a better PowerPoint converter."

### Why This Value Framing?

The value statement directly addresses the false choice from the problem:

- "Brand compliance at compile time" ← solves the manual enforcement problem
- "Markdown and type-checked design tokens" ← solves the velocity problem
- "Native PowerPoint files" ← solves the compatibility problem

The key phrase **"without sacrificing"** emphasizes that you don't have to choose.

---

## Category Positioning Decision

### We Are: A Presentation Build Tool

Not a "markdown to PowerPoint converter" or "presentation framework" — we're a **build tool** that happens to output PowerPoint.

**Why this matters:**
- Sets buyer expectations around CI/CD integration, developer workflows, build-time validation
- Differentiates from consumer tools (Canva, Beautiful.ai) and traditional office software
- Aligns with the "content as code" philosophy without making it the headline

### We Serve: Developers AND Marketing Ops

The dual persona is critical:
- **Developers** get markdown, TypeScript, version control, CI/CD
- **Marketing ops** get brand compliance, design tokens, reproducible output
- **Theme developers** (a subset of developers) get the extensibility layer

This is wider than "just developers" (too narrow) but more specific than "anyone who makes presentations" (too broad).

### We Compete Against: The Status Quo (Manual PowerPoint + Brand Guidelines PDF)

Secondary competitors:
- **Slidev/Reveal.js** — for teams considering code-first but need PowerPoint output
- **Marp** — for teams wanting markdown slides but need better layout control
- **Pandoc** — for teams needing native PPTX but wanting custom layouts

---

## Messaging Hierarchy

### One-Sentence Pitch:
"tycoslide is a presentation build tool that generates native PowerPoint decks from markdown and TypeScript with enforced brand compliance through design tokens."

### Tagline Options:
- "Brand compliance as build errors" (provocative, developer-focused)
- "Presentations as code" (simple, broad appeal)
- "Build presentations like software" (clear, professional)

### Value Props Priority:
1. **PowerPoint Output** — table stakes for corporate environments
2. **Brand Compliance** — the "must-have" business value
3. **Presentations as Code** — the enabler that makes it all fast

