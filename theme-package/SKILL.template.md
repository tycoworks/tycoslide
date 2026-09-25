---
name: slides
description: >
  Build branded slides, presentations, pitch decks, or sales collateral as a .pptx.
  Trigger on "deck," "slides," "presentation," "pitch," ".pptx," or "build me a deck."
compatibility: Needs Node 23.6+ and network access to npm on first use. LibreOffice (soffice) and poppler (pdftoppm) to preview slides. Chrome only if decks contain mermaid diagrams.
---

# slides

## Setup

Before first use, install dependencies from the theme root:

```bash
npm install
unzip -nq assets.dat
```

This installs the tycoslide engine and its dependencies, and unpacks the theme's images so you can copy them into decks. You only need to do this once. If there is no `assets.dat`, skip the unzip. Run every `npx tycoslide` command from this folder too, since that is where the engine is installed and npx finds it nowhere else.


## Overview

This skill builds decks from a markdown deck file. The theme provides slide layouts that control design. Your job: pick the right layouts, fill them with content, and build. You never restyle the layout; the engine clones the real slides, so brand, layout, fonts, and chrome come for free.

## Quick Reference

| Task | Guide |
|------|-------|
| Discover layouts | Read `manifest.json` |
| Find a logo, illustration or icon | Search `assets.json`, then copy it next to the deck (see [Images](#images)) |
| Write a deck (structure, slots, assets) | See [Creating Slides](#creating-slides) below |
| Fix build errors | See [QA](#qa-required) below |

---

## Layout Discovery

Before writing anything, read `manifest.json`. It lists the theme's **layouts** -- for each: `name`, `description`, `parameters` (frontmatter inputs) and `slots` (body regions). A layout is identified by its `name`; every parameter and slot by its `key`. Slots carry `accepts`, and either may be `required`. A slot that accepts an image also shows its `fit`. A `cover` slot crops the image to fill the slot, a `contain` slot shows the whole image, and a `scale-down` slot shows the whole image without ever enlarging it.

A layout's inputs split two ways, parameters and slots; see [markdown.md](node_modules/@tycoworks/tycoslide/docs/markdown.md#parameters-and-slots) for how to fill each. Unfilled ones are dropped, so fill as many of a layout's numbered slots (sections, stats, columns) as you have content for.

Study each layout's `slots` before writing any slides.

### Images

Images live in `assets.json`: every logo, illustration and icon the theme offers, keyed by category and name, each with a `path` and a `description`. **Search it, do not read it whole** -- an icon set alone can run to thousands of entries. **Search for what the icon depicts, not what you mean by it**: a catalog is indexed by image, so "freshness" finds nothing while `grep -i -B1 "clock" assets.json` and `grep -i -B1 "bolt" assets.json` find the icon you wanted, with its path on the line above.

To use an image, copy it into your deck's folder at the same relative path, then write its `path` in the image:

```bash
mkdir -p <deck dir>/assets && cp <theme dir>/assets/hub.png <deck dir>/assets/
```

```markdown
![Central hub connecting three services](assets/hub.png)
```

If your deck is in the theme folder, the file is already there, so skip the copy. An image the user gives you also goes in the deck's folder. Write alt text for this slide, describing what the image shows here rather than repeating the catalog description.

---

## Creating Slides

Write a deck file in markdown, as [markdown.md](node_modules/@tycoworks/tycoslide/docs/markdown.md) describes (see its [full example](node_modules/@tycoworks/tycoslide/docs/markdown.md#full-example)), and build it as its [Build](node_modules/@tycoworks/tycoslide/docs/markdown.md#build) section shows.

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
- **Don't use an image that's wrong for the slot** -- a small slot wants a simple icon, not a dense illustration. If you get a `shrunk to X%` warning, look at the rendered slide: if the image is now too small to make out, use a simpler one. A `leaves X% of the frame empty` warning is the opposite: the image is a different shape from the slot. Neither fails the build -- judge both from the rendered slide.
- **Don't skip alt text** -- describe what a meaningful image shows and why it's there, not "image of". Leave it empty only for decoration, such as backgrounds and icons beside a heading.
- **Don't crop what can't be cropped** -- a `cover` slot crops, so never put a diagram (mermaid included), chart, screenshot or logo in one; choose a layout with a `contain` image slot instead.
- **Don't invent layout names or image paths** -- layouts come from `manifest.json`, and theme images from `assets.json`, copied next to the deck
- **Don't leave required parameters or slots empty** -- and don't leave a placeholder logo or dummy text in an image slot you care about. If you don't have a suitable image, ask the user for one.

---

## QA (Required)

**Assume the first build will fail. Your job is to fix it.**

Your first draft almost never comes out clean. Approach QA as a debugging session, not a confirmation step. If you haven't run at least one build-fix cycle, you're not done.

Build the deck again ([Build](node_modules/@tycoworks/tycoslide/docs/markdown.md#build)) and read the output carefully. Common errors and fixes are in [markdown.md](node_modules/@tycoworks/tycoslide/docs/markdown.md#build), and layout names are in `manifest.json`. Also:

| Error | Fix |
|-------|-----|
| An image didn't swap / placeholder remains | Write a `::key::` region using the image slot's key, containing `![alt](path)` with the path relative to the deck |
| `image "…" not found at …` | For a theme image, copy it into the deck's folder at the path you wrote (search `assets.json`; did you unzip `assets.dat`?) |

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

LibreOffice substitutes any font it can't find, so line breaks in the images can differ slightly from PowerPoint's. Read each slide image and check for:

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
Also read: manifest.json (for layout documentation); search assets.json for images
```

If the subagent finds issues, fix them and rebuild.
