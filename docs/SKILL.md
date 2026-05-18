---
name: build
description: >
  Use this skill any time the user wants to create branded slides, presentations, pitch decks,
  fact sheets, battle cards, one-pagers, or any formatted marketing collateral from markdown.
  Trigger whenever the user mentions "deck," "slides," "presentation," "collateral," "one-pager,"
  "battle card," "fact sheet," or references tycoslide, .pptx output, or markdown-to-slides workflows.
  Also trigger when the user says "build me a deck," "make slides about X," "turn this into a
  presentation," or asks to create any document that combines structured content with branded design.
  If slides or branded documents need to be created, use this skill.
---

# tycoslide

tycoslide builds branded documents from markdown. A theme provides formats (presentation, factsheet, etc.), each with templates that control layout and design. Your job: pick the right templates, fill them with content, and build.

## Quick Reference

| Task | Guide |
|------|-------|
| Discover templates and formats | Read `manifest.json` in this skill directory |
| Write slides (syntax, params, slots) | Read [authoring-guide.md](references/authoring-guide.md) |
| Markdown formatting reference | Read [markdown-syntax.md](references/markdown-syntax.md) |
| Fix build errors | Read [troubleshooting.md](references/troubleshooting.md) |
| CLI flags and debug | Read [cli.md](references/cli.md) |

---

## Theme Discovery

Before writing anything, read `manifest.json` in this skill directory. It contains:

- **formats** -- available output formats and their canvas dimensions
- **templates** -- for each format: name, description, params (with types and required/optional), slots, and documentation (`whenToUse`, `whenNotToUse`, `limits`, `gotchas`)
- **assets** -- theme-bundled images and icons (`$category.name` syntax), if the theme provides any

Ask the user which format they want if the theme supports multiple.

Study each template's `whenToUse` and `limits` before writing any slides. These are your primary guide for matching content to templates.

---

## Creating Slides

**Read [authoring-guide.md](references/authoring-guide.md) for full syntax details.**

Write a `.md` file with global frontmatter (`theme` + `format`) followed by one `---`-separated block per slide. Each slide declares `template:` and its params in frontmatter, with optional body content flowing into slots.

```bash
npx tycoslide build deck.md
```

---

## Template Selection

**Don't create boring decks.** Repeating the same template on every slide makes a forgettable presentation. Use variety and match content shape to template purpose.

### Before Starting

1. **Read manifest.json thoroughly.** Each template has `whenToUse`, `whenNotToUse`, and `limits`. Respect all three.
2. **Match content shape to template purpose.** A comparison belongs in a side-by-side template, a list of features belongs in a card-grid template, a bold claim belongs in a statement template. Don't force content into the wrong template.
3. **Plan narrative arc first.** Decide the sequence of ideas before picking templates. Then assign each idea to its best-fit template from the manifest.

### For Each Slide

**Every slide communicates one idea.** If you're writing more than 5 bullets or 3 paragraphs, split into two slides.

Check each template's `limits` in the manifest for content density constraints. When content overflows, split across slides.

### Avoid (Common Mistakes)

- **Don't repeat the same template** -- vary templates for visual rhythm
- **Don't dump all content on one slide** -- two clear slides beat one crowded slide
- **Don't ignore template limits** -- if manifest says max 4 cards, use 4 or fewer
- **Don't open with a body/content template** -- use an opening/title template for impact
- **Don't skip section dividers** -- for decks over 5 slides, use divider templates to group sections
- **Don't style from markdown** -- no `<span style>`, no raw HTML; the theme owns all design
- **Don't use `---` in body content** -- triple dashes are slide separators
- **Don't forget to quote YAML** -- values with `:`, `[`, `{`, `#` need quotes: `title: "Revenue: Q3"`
- **Don't leave required slots empty** -- check manifest for each template's declared slots

---

## QA (Required)

**Assume the first build will fail. Your job is to fix it.**

Your first draft almost never compiles cleanly. Approach QA as a debugging session, not a confirmation step. If you haven't run at least one build-fix cycle, you're not done.

### Build

```bash
npx tycoslide build deck.md
```

Read error output carefully. Common errors and fixes:

| Error | Fix |
|-------|-----|
| `missing 'template' field` | Add `template:` to the slide's frontmatter |
| `unknown template 'xyz'` | Check template names in manifest.json |
| `unknown slots: [name]` | Use slot names declared by the template |
| `does not accept body content` | Move content to frontmatter params instead |
| `Invalid YAML in slide frontmatter` | Quote the value: `title: "My: Title"` |
| `Code block has no language specified` | Add language tag: `` ```typescript `` |
| `Content extends beyond slide bounds` | Reduce content or split across slides |

**Read [troubleshooting.md](references/troubleshooting.md) for the full error table.**

### Verification Loop

1. Write slides &rarr; Build
2. **Read every error** -- fix all of them
3. Rebuild
4. **If overflow warnings**: reduce content or split into two slides
5. Repeat until build exits cleanly (exit code 0)

**Do not declare success until you've completed at least one build-fix cycle.**

### Content Review (Use Subagents)

**Use subagents for review** -- even for short decks. You've been staring at the content and will see what you expect, not what's there. Subagents have fresh eyes.

After a successful build, spawn a subagent:

```
Review this tycoslide markdown deck. Assume there are issues -- find them.

Check for:
- Slides that are too dense (>7 bullets, >5 paragraphs, too many table rows)
- Same template repeated multiple times with no variety
- Content that doesn't match template purpose (check whenToUse in manifest.json)
- Narrative that doesn't flow logically
- Missing opening or closing/CTA slide
- Slides that are too sparse (a single bullet doesn't need its own slide)

For each issue, suggest a specific fix.

Read: /path/to/deck.md
Also read: manifest.json (for template documentation)
```

If the subagent finds issues, fix them and rebuild.

---

## Core Commands

```bash
# Standard build
npx tycoslide build deck.md

# Debug mode (shows layout measurements)
npx tycoslide build deck.md --debug
```

See [cli.md](references/cli.md) for all flags.

---

## Dependencies

tycoslide requires Node.js and two npm packages plus a browser for layout measurement:

```bash
# Install the CLI and the theme (replace with your theme package name)
npm install @tycoslide/cli <theme-package>

# Required: Playwright's Chromium for HTML layout measurement
npx playwright-core install chromium
```

These are project-level dependencies (installed into `node_modules/`, not global). The Playwright Chromium install is required -- tycoslide measures slide layouts via headless browser and will fail without it.
