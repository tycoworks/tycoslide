---
name: theme
description: Build tycoslide themes from reference PowerPoint decks. Use when the user wants to extract a complete theme from a PPTX, add a template to an existing theme, or convert PowerPoint slide designs into tycoslide code. Triggers on "extract theme", "build theme from PPTX", "add a template", "new slide type", "implement this slide", "convert this layout", or when the user provides a PPTX/PDF reference.
---

# Theme from PPTX

## Quick Reference

| Task | Guide |
|------|-------|
| Bootstrap a new theme from a reference PPTX | Read [extract-theme.md](extract-theme.md) |
| Add a template to an existing theme | Read [add-template.md](add-template.md) |

## Choosing the Right Mode

**Extract theme** when starting from scratch — no `brand.ts`, no `fonts.ts`, no format files yet. This mode catalogs the full deck, derives the shared foundations (palette, type scale, spacing, chrome), then builds templates on top.

**Add template** when the theme already exists and you need one more template. The palette, type scale, and chrome wrappers are already defined — you just need to measure one slide and wire it in.

## Shared Resources

Both modes use the same PPTX extraction reference:

- [references/pptx-extraction.md](references/pptx-extraction.md) — XML format, coordinate systems, property extraction, manifest fields

## Core Principles

- **Measure first, model second, code third.** Extract exact measurements from PPTX XML. Never eyeball positions from a visual preview.
- **Foundations before templates.** Palette, type scale, spacing, and chrome are shared. Derive them from the full corpus, not per-slide.
- **Zero hardcoded hex in format files.** All colors live in `brand.ts` and are referenced via `palette.*` or `t.onLight.*`/`t.onDark.*`.
- **Reuse before creating.** Most templates reuse existing layouts (`body`, `title`, `cover`) with different tokens. Only create a new layout for a genuinely different spatial skeleton.
