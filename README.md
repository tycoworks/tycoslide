# tycoslide

Let AI agents build slides from existing PowerPoint (`.pptx`) files.

> **Early release** — tycoslide is under active development.

## How it works

1. **tycoslide wraps your PowerPoint file as an agent skill.**
2. **Your agents use the skill to write slides in markdown.**
3. **tycoslide builds a finished PowerPoint file from the markdown.**

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
