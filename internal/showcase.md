# Showcase Presentation Strategy

Analysis of how `packages/theme-default/examples/showcase.md` should be structured. The showcase serves three purposes: demonstrate tycoslide usage, demonstrate default theme layouts, and advertise the product.

---

## Approach: The Ad IS the Showcase

Each slide serves double duty — makes a product point while demonstrating a layout. No dedicated "layout catalog" section. The advertisement content naturally exercises every layout in the theme.

---

## Slide Sequence (20 slides)

| # | Layout | Variant | Content | Demonstrates |
|---|--------|---------|---------|-------------|
| 1 | `title` | default | tycoslide / Build presentations like software | Title layout |
| 2 | `agenda` | default | Overview items | Agenda, list component |
| 3 | `statement` | hero | One-liner from positioning framework | Statement hero, accent colors |
| 4 | `comparison` | default | Brand Compliance vs Developer Velocity | Comparison, two-slot |
| 5 | `cards` | flat | Three Pillars (Editable PowerPoint Slides, Pure TypeScript Themes, Build-Time Validation) | Cards flat variant |
| 6 | `stat` | default | "17 layouts" or "0 silent failures" | Stat layout |
| 7 | `section` | default | "How It Works" | Section divider |
| 8 | `body` | default | Pipeline mermaid diagram | Mermaid component |
| 9 | `image-right` | default | Markdown In, PowerPoint Out | Image-right, code in body |
| 10 | `image-left` | default | TypeScript Themes / token system | Image-left, list in body |
| 11 | `two-column` | default | What You Write / What You Get | Two-column, slot-based |
| 12 | `body` | default | Rich Text Formatting | Text formatting components |
| 13 | `body` | default | Presentations as Code (TypeScript DSL) | Code component |
| 14 | `image` | default | Centered diagram or icon | Image layout |
| 15 | `caption` | default | Architecture with caption | Caption layout |
| 16 | `cards` | default | Roadmap (On Brand / On Message / Content Infrastructure) | Cards default variant |
| 17 | `quote` | default | Manifesto quote | Quote component |
| 18 | `body` | default | Customer testimonial | Testimonial component |
| 19 | `title-only` | default | "Try It Yourself" CTA | Title-only layout |
| 20 | `end` | default | Mirrors title | End layout |

---

## Decisions

### Kill the pillar detail slides

The three dedicated pillar slides (Editable PowerPoint Slides, Pure TypeScript Themes, Build-Time Validation as full image-right/image-left/body slides) are removed. The cards slide delivers the three-pillar summary. Pillar content is absorbed into slides that *demonstrate* the claims through the layouts themselves.

### `body` layout repeats are intentional

`body` appears three times because it is the workhorse layout and demonstrates different components each time (mermaid, text formatting, code, testimonial).

### `blank` layout

Hardest to showcase — empty by design. Options: use for a full-bleed composition, or skip and note in speaker notes. Decision pending.

### Image placeholders

`$icons.*` works for cards and image-left/right but undersells `caption` and `image` layouts. Real images would be more impressive but add asset management. Decision pending.

---

## Two-Birds Examples

How specific slides serve both ad and showcase purposes:

- **`stat` layout + "build-time validation"**: Use "0 silent failures / Every error caught before the deck ships." Layout demonstrated; positioning point made.
- **`two-column` layout + "markdown authoring"**: Left column shows raw markdown, right column describes what it produces. Layout demonstrated; authoring experience shown.
- **`image-right` layout + "PowerPoint output"**: Body explains native .pptx with real text and shapes. Image slot shows icon or screenshot. Layout demonstrated; output story told.
- **`comparison` layout + market positioning**: Brand Compliance vs Developer Velocity naturally fits the comparison layout. Positioning argument made; layout shown.
- **The .pptx file itself IS the proof**: The audience opens it in PowerPoint, edits a slide, sees real text. No slide needed to argue this.

---

## Convention: `example.md` Per Theme

Every theme should ship an `examples/example.md` that exercises every layout at least once. The default theme's example doubles as a product showcase. Other themes' examples would be simpler.

Pros:
- Built-in layout reference that doubles as a visual test
- Users get an immediate "what does this theme look like?" artifact
- Copy-paste source material for authors who want a specific layout
- Catches rendering bugs — theme authors must exercise every layout

Cons:
- Maintenance burden on theme authors
- Conflates "reference" with "showcase" — one file cannot be both perfectly
- Minimal themes with few layouts do not need a 20-slide showcase

Recommendation: convention, not hard requirement. Name it `example.md`. Document in theme authoring guide.

---

## Layout Coverage

**17 layouts in the default theme:** `title`, `section`, `body`, `stat`, `quote`, `end`, `blank`, `image`, `image-left`, `image-right`, `two-column`, `comparison`, `statement`, `agenda`, `cards`, `caption`, `title-only`

**Current showcase uses 8 of 17.** The proposed sequence covers 15 of 17 (missing `blank`, which is intentionally empty). The `body` layout appears multiple times to demonstrate different components.

---

## Component Coverage

**Markdown-authorable components demonstrated:** text formatting (bold, italic, strikethrough, underline, accent colors, hyperlinks), list, code, mermaid, table, testimonial, quote, card (via cards layout), image (via image slots).

**Not demonstrated (DSL-only):** row, column, stack, grid, shape, line, slideNumber, plainText. These belong in developer docs, not the showcase.

---

## Outstanding Work

### Slide 2 (Agenda)
- Second item "Markdown → .pptx" title might need tweaking. TBD.

### Slide 4 (Transform)
- Needs a title.

### Slide 5 (Cards — Key Features)
- Icons feel too big. Try increasing card padding from 0.25 to 0.3 to contract them slightly.

### Slide 7 (Mermaid — Build Pipeline)
- Needs redesign. Details TBD.

### Slide 8/9 (Stat + Quote)
- Narrative issue: "Zero Silent Failures" feels out of place after the table.
- Options: move stat earlier, make stat the dark slide instead of quote, or restructure.
- Consider: stat on dark background as section closer before design system slides.

### Slide 10 (Color Palette)
- Doesn't match Materialize reference screenshots. Needs more/better squares.

### Slide 11 (Typography)
- Doesn't match Materialize reference closely. Should include font sizes in the type specimens.
