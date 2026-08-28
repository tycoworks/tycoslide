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

## Quick Reference

| Task | Guide |
|------|-------|
| Discover layouts and assets | Read `manifest.json` |
| Write a deck (structure, slots, assets) | See [Creating Slides](#creating-slides) below |
| Fix build errors | See [QA](#qa-required) below |

---

## Layout Discovery

Before writing anything, read `manifest.json`. It contains:

- **layouts** -- for each: `name`, `description`, `parameters` (frontmatter inputs) and `slots` (body regions). A layout is identified by its `name`; every parameter and slot by its `key`. Parameters carry a `type`, slots carry `accepts`, and either may be `required`
- **assets** -- brand logos, client logos, illustrations, and icons (`description`)

A layout's inputs split two ways (see [syntax.md](syntax.md) for details):
- **parameters** -- one value on a frontmatter line. Types: `template`, `image`. Fill by putting a value under the parameter's key in the slide frontmatter.
- **slots** -- a multi-line region in the body. Accept types: `text`, `table`, `image`. Fill as a `::key::` region, using the slot's `key` from the manifest; a fenced code block routes to a `text` slot, a fenced mermaid block to an `image` slot.

A slot may accept more than one content type -- the manifest lists each slot's `accepts`, and the shape of the content you write selects which one.

Parameters and slots you leave unfilled are dropped from the slide, so a layout with numbered slots (several sections, stats, columns) renders only the ones you fill -- fill as many as you have.

Study each layout's `slots` before writing any slides.

---

## Creating Slides

> **Every layout, parameter, and slot name in the examples below is a placeholder.** Your theme's real names live in `manifest.json` — read it first, and never assume a name shown in an example exists in your theme.

Write a deck file in markdown. The file starts with a global frontmatter block declaring the theme, followed by slides separated by `---`.

```markdown
---
theme: ./theme.json
---

---
layout: Title             # ← a layout from your manifest.json
title: Q2 Business Review # ← a parameter that layout declares
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

1. **Global frontmatter** (required) -- the first `---`-delimited block. Must contain `theme:` pointing to the theme config file. The output `.pptx` is written next to the deck, named after it (`deck.md` → `deck.pptx`).
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
- Slots (accepting `text`, `table`, `image`) are filled by body regions, not frontmatter -- see below.
- A slide may also carry a `notes:` block in frontmatter -- plain-text speaker notes for the slide's notes page (see [syntax.md](syntax.md#speaker-notes)). It is slide-level metadata, not a parameter or slot.

### Body content, slots, and formatting

See [syntax.md](syntax.md) for the full syntax reference: body content (paragraphs, bullets, nesting), inline formatting (bold, italic, strikethrough, underline, hyperlinks), named slots (`::key::` markers), the parameter/slot split (parameters: template, image; slots accept: text, table, image), and image parameters.

### Build

Build the deck (replace `<deck.md>` with your deck file):

```bash
npx tycoslide build <deck.md>
```

The `.pptx` is written next to your deck file (same directory as `<deck.md>`).

---

## Layout Selection

**Don't create boring decks.** Repeating the same layout on every slide makes a forgettable presentation. Use variety and match content shape to the layout's slots.

### Before Starting

1. **Read the manifest thoroughly.** Each layout declares its `slots` (and the `accepts` types each one takes) -- the shape of what it can hold. Respect them.
2. **Match content shape to the layout's slots.** A comparison fits a layout with two or three text columns; quantified proof fits one with stat slots; a customer voice fits a quote slot. The slots tell you what fits -- don't force content into the wrong shape.
3. **Assign each idea to its best-fit layout** from the manifest. Some layouts come in more than one variant (e.g. a dark and a light version, shown in the name) — consider which suits the deck.

### For Each Slide

**Every slide communicates one idea.** Put the takeaway in the headline, then support it.

Keep each slot's content to what its region comfortably holds. When content overflows, split it across slides.

### Avoid (Common Mistakes)

- **Don't repeat the same layout** -- vary layouts for visual rhythm
- **Don't overstuff a slot** -- keep content to what its region comfortably holds; split across slides when there's too much
- **Don't restyle the layout** -- the theme owns all design; you only fill slots
- **Don't use an image that's wrong for the slot** -- a small slot wants a simple icon, not a dense illustration. If you get a `shrunk to X%` warning, look at the rendered slide: if the image is now too small to make out, use a simpler one.
- **Don't invent layout or asset names** -- only use what exists in the manifest
- **Don't leave required parameters or slots empty** -- and don't leave a placeholder logo or dummy text in an image parameter you care about

---

## QA (Required)

**Assume the first build will fail. Your job is to fix it.**

Your first draft almost never comes out clean. Approach QA as a debugging session, not a confirmation step. If you haven't run at least one build-fix cycle, you're not done.

Build the deck again ([Build](#build)) and read the output carefully. Common errors and fixes:

| Error | Fix |
|-------|-----|
| `unknown layout "xyz"` | Check layout names in `manifest.json` |
| A parameter or slot didn't fill | Use the key names the layout declares -- parameters in frontmatter, slots as body regions |
| An image didn't swap / placeholder remains | Use the image parameter's key name in frontmatter, and an asset path that exists in `manifest.json` |
| YAML parse error | Fix the YAML syntax in the slide's frontmatter |
| `Skipped setting relation target` | The asset image couldn't be placed; check the path and file |
| `forbidden style directive` | Remove `style`, `classDef`, `linkStyle`, or `%%{init}` from your mermaid block -- use `class` for grouping instead |
| `no "mermaid" block` | The theme has no mermaid color config -- add a `mermaid` section to theme.json |

### Verification Loop

1. Write the deck file &rarr; Build
2. **Fix the error** -- the build stops at the first one, so expect several rounds
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
- Slides where content overflows its slot (more bullets/stats/rows than the region holds)
- Same layout repeated multiple times with no variety
- Content that doesn't match the layout's slots (check `accepts` in manifest.json)
- Leftover placeholder logos or dummy text in the rendered images

For each issue, suggest a specific fix.

Read: /path/to/deck.md and the rendered PNGs in the working directory
Also read: manifest.json (for layout documentation)
```

If the subagent finds issues, fix them and rebuild.

---

## Full Example

See [syntax.md](syntax.md#full-example) for a complete multi-slide deck example.
