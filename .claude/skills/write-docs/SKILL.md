---
name: write-docs
description: Write, edit, and review tycoslide user documentation following the project style guide. Use this skill whenever working on any file under docs/ — creating new pages, editing existing content, adding sections, documenting new features, updating examples, or reviewing doc quality. Also trigger when the user mentions "docs", "documentation", "write up", references a specific doc page (quick-start, themes, components, etc.), or asks to document a feature. Even if the user just says "update the docs" without specifying a file, use this skill.
paths: "docs/**"
---

# tycoslide Documentation Writer

Write and maintain user-facing documentation for the tycoslide project. Every doc page follows a specific style — read the style guide before writing anything.

## Before You Write

1. **Read the style guide.** Open `references/style-guide.md` in this skill directory. It defines voice, tone, structure, code examples, content partitioning, and anti-patterns. Internalize it before writing a single line.

2. **Check content ownership.** Each doc page owns specific topics. The style guide's Content Partitioning table tells you which page owns what. Put content on the right page. Cross-reference, never duplicate.

3. **Read the target page first.** Match the existing structure, heading levels, and patterns already on that page. New sections should feel like they belong.

## Writing Workflow

### Editing an Existing Page

1. Read the full page
2. Read `references/style-guide.md`
3. Make changes that match the page's existing patterns
4. Verify: no anti-patterns, correct heading levels, proper cross-references

### Creating a New Section

1. Read `references/style-guide.md` for the section pattern (especially the component/layout pattern if documenting a component)
2. Open with a one-sentence declarative description
3. Follow the standard order: description → critical notes → parameters table → subsections → examples → horizontal rule
4. Keep code examples minimal (2–4 blocks max per section)

### Creating a New Page

1. Read `references/style-guide.md`
2. Add the page to the Content Partitioning table in the style guide
3. Open with H1 and one declarative sentence
4. Use H2/H3/H4 hierarchy (no H5)
5. End with a "Related" section linking to relevant pages

## Quick Reference: Common Mistakes

These are the mistakes most likely to slip through. Catch them before finishing:

- **Tutorial voice** — "Now let's add a card" → "Cards display content with an optional image and title"
- **Infrastructure sentences** — "There is a feature called X that lets you Y" → "X does Y"
- **Implementation leaks** — mentioning pptxgenjs, Playwright, Chromium, Shiki, or any internal dependency
- **Callout boxes** — "Note:", "Warning:", "Tip:" → state the information directly in bold or prose
- **Contractions** — "don't", "can't", "it's" → "do not", "cannot", "it is"
- **Hedging** — "This might", "You could consider" → confident, direct statements
- **Bare code fences** — always include a language tag (`bash`, `markdown`, `typescript`)
- **Wrong page** — check the Content Partitioning table before adding content

## Content Partitioning (Quick Lookup)

| Topic | Page |
|-------|------|
| About, design principles, FAQ | `about.md` |
| Install, first build, editor setup | `quick-start.md` |
| Frontmatter, separators, text, lists, tables, notes, directive summary | `markdown-syntax.md` |
| Component reference, directive syntax, custom components, DSL, tokens | `components.md` |
| Layout authoring, slots, masters, render function | `layouts.md` |
| Theme config, colors, fonts, spacing, variants, multi-format | `themes.md` |
| CLI flags, exit codes, debug | `cli.md` |
| Error messages, causes, fixes | `troubleshooting.md` |
