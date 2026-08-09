# tycoslide

Generate slides from markdown using your real PowerPoint templates.

> **Early release** — tycoslide is under active development.

## Why tycoslide?

AI can write great slide content, but it can never get things on-brand. No matter what you try, fonts, logos, and colors end up slightly wrong, and you spend hours fixing it by hand.

tycoslide helps AI agents build presentations using your real slide templates, so they're always on-brand. You define a theme with your .pptx files, layouts and design assets, from which agents can quickly build new presentations using markdown.

## Quick Start

```bash
npm install @tycoworks/tycoslide
```

Create `deck.md`:

```markdown
---
theme: ./theme.json
---

---
layout: Title
title: Quarterly Review
name: Jane Doe
jobTitle: Engineering
---

---
layout: Body
title: Highlights
---

- Revenue up 12% quarter-over-quarter
- Three major product launches completed
```

Build:

```bash
tycoslide build deck.md                   # → deck.pptx
```

## CLI

```bash
tycoslide build deck.md       # markdown → PPTX (theme resolved from deck frontmatter)
tycoslide smoke               # one slide per layout → smoke-all.pptx
tycoslide plugin              # generate AI agent plugin package
tycoslide manifest            # print layout + asset catalog to stdout
```

## Theme Structure

A theme packages a PPTX template, design assets, and a config file into one directory.

```
my-theme/
  template/corp-template.pptx
  assets/logos/
  assets/icons/
  theme.json
  package.json
```

**Template** — the PPTX file with named shapes that tycoslide fills.
**Layout** — a slide pattern in the template (Title, Body, Quote, etc.).
**Theme** — the directory that bundles a template, assets, and config.
**Manifest** — a machine-readable catalog of layouts and assets for AI agents.
