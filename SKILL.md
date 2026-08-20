---
name: slides
description: >
  Build branded slides, presentations, pitch decks, or sales collateral as a .pptx.
  Trigger on "deck," "slides," "presentation," "pitch," ".pptx," or "build me a deck."
---

# slides

## Setup

Before first use, install dependencies from the theme root:

```bash
npm install
```

This installs the tycoslide engine and its dependencies. You only need to do this once.

## Overview

This skill builds on-brand decks from a markdown deck file. The theme provides slide layouts that control design. Your job: pick the right layouts, fill them with content, and build. You never restyle the layout; the engine clones the real slides, so brand, layout, fonts, and chrome come for free.

For brand voice and naming guidelines, read `brand.md` if it exists alongside this skill.

## Quick Reference

| Task | Guide |
|------|-------|
| Discover layouts and assets | Read `manifest.json` |
| Write a deck (structure, slots, assets) | See [Creating Slides](#creating-slides) below |
| Fix build errors | See [QA](#qa-required) below |

---

## Layout Discovery

Before writing anything, read `manifest.json`. It contains:

- **layouts** -- for each: `name`, `description`, `parameters` (frontmatter inputs) and `slots` (body regions), each with `type` and optionally `required`, `limit`, `codeTheme`, `mermaidVariant` (plus, for assets, a `type` of `icon`/`image`/`background`), plus documentation (`whenToUse`, `whenNotToUse`)
- **assets** -- brand logos, client logos, illustrations, and icons (`description`, `whenToUse`)

A layout's inputs split two ways (see [syntax.md](syntax.md) for details):
- **parameters** -- one value on a frontmatter line. Types: `template`, `image`. Fill by putting a value under the parameter's key in the slide frontmatter.
- **slots** -- a multi-line region in the body. Types: `text`, `table`, `code`, `mermaid`. Fill as the default body region (after the closing `---`) or a `::name::` region.

A single physical slide may back multiple layouts. When two manifest entries share the same `slideNumber`, they render into the same underlying PPTX shapes but declare their fill differently -- e.g. one layout exposing the fill as an `image` parameter and a sibling exposing it as a `mermaid` slot. Pick between them by naming the layout you want in frontmatter (`layout: Full bleed diagram` vs `layout: Full bleed image`); the declaration is unambiguous per layout, so the compiler always knows how to interpret the content you provide.

Study each layout's `slots` and `limit`s before writing any slides.

---

## Creating Slides

Write a deck file in markdown. The file starts with a global frontmatter block declaring the theme, followed by slides separated by `---`.

```markdown
---
theme: ./theme.json
---

---
layout: Title
title: Q2 Business Review
subtitle: Engineering Division
---

---
layout: Quote dark
quote: Great products are built by great teams.
attributionName: Jane Smith
attributionTitle: CEO, Acme Corp
logo: assets/clients/acme.png
---
```

A text shape that holds several lines (e.g. an attribution with a name over a title) surfaces as one key per line -- fill each as its own scalar (`attributionName`, `attributionTitle` above), never as a YAML list.

### File structure

A deck file has three parts:

1. **Global frontmatter** (required) -- the first `---`-delimited block. Must contain `theme:` pointing to the theme config file. May also contain `output:` to set the filename (defaults to `deck.md` → `deck.pptx`).
2. **Slides** -- each begins with a `---` separator. A slide's frontmatter sits between `---` delimiters. Body content follows the closing `---`.
3. **Slide separators** -- a `---` on its own line separates slides.

### Slide frontmatter

Every slide must have a `layout:` key. All other frontmatter keys map 1:1 to the layout's **parameters** (template and image inputs).

```yaml
---
layout: Body
title: Key Achievements
subtitle: This Quarter
---
```

- `layout` is required and consumed by the compiler (not forwarded as content).
- All other frontmatter keys fill parameters: `title` fills the `title` template parameter, `subtitle` fills the `subtitle` parameter, `hero` fills the `hero` image parameter, etc. A multi-line text shape surfaces as several keys (e.g. `name` + `jobTitle`); fill each as its own scalar line.
- Slots (`text`, `table`, `code`, `mermaid`) are filled by body regions, not frontmatter -- see below.
- A slide may also carry a `notes:` block in frontmatter -- plain-text speaker notes for the slide's notes page (see [syntax.md](syntax.md#speaker-notes)). It is slide-level metadata, not a parameter or slot.

### Body content, slots, and formatting

See [syntax.md](syntax.md) for the full syntax reference: body content (paragraphs, bullets, nesting), inline formatting (bold, italic, strikethrough, underline, hyperlinks), named slots (`::name::` markers), the parameter/slot split (parameters: template, image; slots: text, table, code, mermaid), and image parameters.

### Build

Run the command from `manifest.json`'s `build.command`:

```bash
# e.g.: npx tycoslide build deck.md
```

The deck is written to your current working directory (not inside the skill).

---

## Layout Selection

**Don't create boring decks.** Repeating the same layout on every slide makes a forgettable presentation. Use variety and match content shape to layout purpose.

### Before Starting

1. **Read the manifest thoroughly.** Each layout has `whenToUse`, `whenNotToUse`, and `limit`s. Respect all three.
2. **Match content shape to layout purpose.** A comparison belongs in a two/three-column layout, quantified proof belongs in stat blocks, a customer voice belongs in a quote or testimonial layout. Don't force content into the wrong layout.
3. **Plan narrative arc first.** Decide the sequence of ideas before picking layouts. Then assign each idea to its best-fit layout from the manifest. Keep one variant (all dark or all light) across the deck.

### For Each Slide

**Every slide communicates one idea.** If you're writing more than 5 bullets or 3 paragraphs, split into two slides. Put the takeaway in the headline, then support it.

Check each layout's `limit` in the manifest for content density constraints. When content overflows, split across slides.

### Avoid (Common Mistakes)

- **Don't repeat the same layout** -- vary layouts for visual rhythm
- **Don't dump all content on one slide** -- two clear slides beat one crowded slide
- **Don't ignore layout limits** -- if a slot says max 4 stats, use 4 or fewer
- **Don't open with a body/content layout** -- use the Title layout for impact
- **Don't skip section dividers** -- for decks over 5 slides, use Section title layouts to group sections
- **Don't restyle the layout** -- the theme owns all design; you only fill slots
- **Don't use an image that's wrong for the slot** -- a small slot wants a simple icon, not a dense illustration; if the build warns an image shrank to a small %, swap it for a simpler one
- **Don't invent layout or asset names** -- only use what exists in the manifest
- **Don't leave required parameters or slots empty** -- and don't leave a placeholder logo or dummy text in an image parameter you care about
- **Don't mix dark and light** -- keep one variant across the deck

---

## QA (Required)

**Assume the first build will fail. Your job is to fix it.**

Your first draft almost never comes out clean. Approach QA as a debugging session, not a confirmation step. If you haven't run at least one build-fix cycle, you're not done.

### Build

Run the command from `manifest.json`'s `build.command`:

```bash
# e.g.: npx tycoslide build deck.md
```

Read output carefully. Common errors and fixes:

| Error | Fix |
|-------|-----|
| `Unknown layout: 'xyz'` | Check layout names in `manifest.json` |
| A parameter or slot didn't fill | Use the key names the layout declares -- parameters in frontmatter, slots as body regions |
| An image didn't swap / placeholder remains | Use the image parameter's key name in frontmatter, and an asset path that exists in `manifest.json` |
| YAML parse error | Fix the YAML syntax in the slide's frontmatter |
| `Skipped setting relation target` | The asset image couldn't be placed; check the path and file |
| `forbidden style directive` | Remove `style`, `classDef`, `linkStyle`, or `%%{init}` from your mermaid block -- use `class` for grouping instead |
| `mermaid-cli is required` | Install mermaid-cli: `npm i -D @mermaid-js/mermaid-cli` |
| `no "mermaid" block` | The theme has no mermaid color config -- add a `mermaid` section to theme.json |

### Verification Loop

1. Write the deck file &rarr; Build
2. **Read every error** -- fix all of them
3. Rebuild
4. **If content overflows**: reduce content or split into two slides
5. Repeat until the build exits cleanly

**Do not declare success until you've completed at least one build-fix cycle.**

### Visual Check

After a clean build, render the `.pptx` to PNGs and inspect them:

```bash
soffice --headless --convert-to pdf --outdir . <deck>.pptx
pdftoppm -png -r 96 <deck>.pdf <name>
```

Read each slide image and check for:

- **Word wrapping** -- text that breaks mid-word or overflows its container
- **Cramped text** -- content too dense for the slide area
- **Leftover placeholders** -- dummy text ("Lorem ipsum", "Firstname Lastname") or a placeholder logo that should have been swapped
- **Cut-off content** -- text or images clipped at slide edges

If you spot issues, reduce content, switch layouts, or split into multiple slides. Rebuild and re-check.

### Content Review (Use Subagents)

**Use subagents for review** -- even for short decks. You've been staring at the content and will see what you expect, not what's there. Subagents have fresh eyes.

After a successful build, spawn a subagent:

```
Review this deck. Assume there are issues -- find them.

Check for:
- Slides that are too dense (>7 bullets, >5 paragraphs, too many stats/rows)
- Same layout repeated multiple times with no variety
- Content that doesn't match layout purpose (check whenToUse in manifest.json)
- Narrative that doesn't flow logically
- Missing opening (Title) or closing (Thank you) slide
- Slides that are too sparse (a single bullet doesn't need its own slide)
- Leftover placeholder logos or dummy text in the rendered images

For each issue, suggest a specific fix.

Read: /path/to/deck.md and the rendered PNGs in the working directory
Also read: manifest.json (for layout documentation)
```

If the subagent finds issues, fix them and rebuild.

---

## Full Example

See [syntax.md](syntax.md#full-example) for a complete multi-slide deck example.

---

## Core Commands

```bash
# Build a deck (use command from manifest.json's build.command)
# e.g.: npx tycoslide build deck.md

# Render to images for visual QA
soffice --headless --convert-to pdf --outdir . <deck>.pptx
pdftoppm -png -r 96 <deck>.pdf <name>
```
