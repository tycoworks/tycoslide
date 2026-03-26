# Showcase Presentation Strategy

Analysis of how `packages/theme-default/examples/showcase.md` should be structured. The showcase serves three purposes: demonstrate tycoslide usage, demonstrate default theme layouts, and advertise the product.

---

## Approach: The Ad IS the Showcase

Each slide serves double duty — makes a product point while demonstrating a layout. No dedicated "layout catalog" section. The advertisement content naturally exercises every layout in the theme.

The showcase is organized into **three sections** matching the agenda:

1. **tycoslide** — the pitch (what it is, how it works, why it matters)
2. **Gallery** — art of the possible (what you can build, emotional beats)
3. **Design System** — the visual identity (colors, typography)

---

## Slide Sequence (17 slides)

### Section 1: tycoslide (slides 1–7)

| # | Layout | Variant | Content | Demonstrates |
|---|--------|---------|---------|-------------|
| 1 | `title` | default | tycoslide / Build slides like software | Title layout |
| 2 | `agenda` | default | tycoslide, Gallery, Design System | Agenda layout |
| 3 | `statement` | default | Positioning one-liner with accent colors | Statement layout |
| 4 | `transform` | default | Markdown → PowerPoint side-by-side | Transform layout, card component, code component |
| 5 | `cards` | default | Key Features — three pillars | Cards default variant |
| 6 | `body` | centered | How It Compares — competitor table | Body centered variant, table component |
| 7 | `body` | default | How It Works — mermaid pipeline | Body default variant, mermaid component |

### Section 2: Gallery (slides 8–13)

| # | Layout | Variant | Content | Demonstrates |
|---|--------|---------|---------|-------------|
| 8 | `section` | default | "Gallery" | Section divider |
| 9 | `two-column` | default | Rich Markdown Authoring — what you write / what you get | Two-column layout, slot system |
| 10 | `stat` | default | Zero Silent Failures | Stat layout |
| 11 | `quote` | dark | "Software is eating the world..." | Quote dark variant |
| 12 | `cards` | flat | What You Can Build — use cases | Cards flat variant |
| 13 | `quote` | default | "The best slide decks..." | Quote default (light) variant |

### Section 3: Design System (slides 14–17)

| # | Layout | Variant | Content | Demonstrates |
|---|--------|---------|---------|-------------|
| 14 | `section` | default | "Design System" | Section divider (second use) |
| 15 | `shapes` | default | Color Palette | Shapes layout |
| 16 | `body` | default | Typography specimens | Body layout (third use), text formatting |
| 17 | `end` | default | tycoslide / Build presentations like software | End layout |

---

## Decisions

### Three-section narrative

The original flat 6-item agenda was replaced with a 3-section structure. Each section maps to one agenda item: **tycoslide** (the tool), **Gallery** (art of the possible), **Design System** (the visual identity). This gives the presentation a clear narrative arc.

### Stat and quote moved to Gallery

"Zero Silent Failures" and the dark quote felt narratively disconnected between the pipeline slide and the design system. Moving them to the Gallery section creates a better emotional arc: two-column (informational) → stat (proof point) → dark quote (emotional) → flat cards (practical) → light quote (closing beat).

### Kill the pillar detail slides

The three dedicated pillar slides (Editable PowerPoint Slides, Pure TypeScript Themes, Build-Time Validation as full image-right/image-left/body slides) are removed. The cards slide delivers the three-pillar summary. Pillar content is absorbed into slides that *demonstrate* the claims through the layouts themselves.

### `body` layout repeats are intentional

`body` appears three times because it is the workhorse layout and demonstrates different components each time (table, mermaid, typography).

### Icons grid dropped

Only 4 `$icons.*` are available (`description`, `palette`, `shield`, `redo`). Not enough for a meaningful icons grid slide. Dropped from the plan.

### `blank` and `lines` layouts omitted

`blank` is empty by design — no natural showcase content. `lines` is a demo/utility layout. Both omitted intentionally.

---

## Convention: `example.md` Per Theme

Every theme should ship an `examples/example.md` that exercises every layout at least once. The default theme's example doubles as a product showcase. Other themes' examples would be simpler.

Recommendation: convention, not hard requirement. Name it `example.md`. Document in theme authoring guide.

---

## Layout Coverage

**14 layouts in the default theme:** `title`, `section`, `body`, `stat`, `quote`, `end`, `blank`, `two-column`, `statement`, `agenda`, `cards`, `transform`, `shapes`, `lines`

**Current showcase uses 11 of 14.** Missing: `blank` (empty by design), `lines` (demo/utility). The `body` layout appears three times to demonstrate different components. Both `cards` variants (default, flat) and both `quote` variants (default, dark) are shown.

---

 Then I feel like we're not quite on the right approach with the overall narrative. What I would like to do is instead of having the middle section be whatever it is right now, gallery. Instead of a gallery, we should have a features section because we haven't really talked about the way that we do flexbox layouts. For example, like we have containers of different types, rows, columns, grids that we could show in a couple of slides. We can show all the different types of components. We can have a slide for text formatting. I think instead of a gallery, it should be more like a 10 slides showing the key features or something like that. We'd want to show containers, so stacks, grids, rows, columns, and the kinds of layouts you can create with those. Obviously, the design token stuff, that can still be a separate section. What I would like to do is for you to spin up another research agent to look through all the documentation that we have for this product and see what key features you might want to show in that middle section. And then maybe the last section is called default theme or something like that. That might make more sense.

## Component Coverage

**Markdown-authorable components demonstrated:** text formatting (bold, italic, strikethrough, underline, accent colors, hyperlinks), list, code, mermaid, table, card (via cards layout), image (via image slots).

**Not demonstrated (DSL-only):** row, column, stack, grid, shape, line, slideNumber, plainText. These belong in developer docs, not the showcase.

---

## Outstanding Work

### Slide 5 (Cards — Key Features)
- Icons feel too big. Try increasing card padding from 0.25 to 0.3 to contract them slightly.

### Slide 7 (Mermaid — Build Pipeline)
- Needs redesign. Details TBD.

### Slide 15 (Color Palette)
- Doesn't match Materialize reference screenshots. Needs more/better squares.

### Slide 16 (Typography)
- Doesn't match Materialize reference closely. Should include font sizes in the type specimens.
