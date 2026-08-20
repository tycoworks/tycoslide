# tycoslide

Create editable, on-brand PowerPoint slides from markdown.

> **Early release** — tycoslide is under active development.

## How it works

1. **tycoslide wraps existing PowerPoint files as reusable templates.**
2. **You (or an agent) write slides in markdown.**
3. **tycoslide builds new PowerPoint files.**

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
npx tycoslide build deck.md               # → deck.pptx
```

## CLI

```bash
npx tycoslide build deck.md       # markdown → PPTX (theme resolved from deck frontmatter)
npx tycoslide build deck.md --no-notes   # omit speaker notes from the output
npx tycoslide package             # generate the Agent Skill (SKILL.md + manifest.json)
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
