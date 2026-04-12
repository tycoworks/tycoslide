# Skills — Design Decisions & Future Direction

Single source of truth for tycoslide's AI skill strategy. Consolidates learnings from multiple rounds of design work (skills-architecture.md, skill-design.md, skill-manifest.md, Theme_as_Entry_Point.md — all now superseded by this file).

**Status**: Parked. Priority is multi-format themes. Resume after that ships.

---

## What We Learned

### The skill is a compiler reference, not a design advisor

The skill teaches AI tycoslide's markdown dialect — valid syntax, what each layout accepts, what causes build errors. The base model + user prompt handles creative decisions. This was validated across 6 architect reviews.

**The bright line**: Does this require knowledge of tycoslide's syntax, build system, or theme architecture? Yes → skill handles it. No → user's problem.

### Hand-authored skills beat auto-generated ones (for now)

LLMs read prose + examples better than JSON schemas. The valuable content (when-to-use guidance, content limits, ordering conventions) comes from human judgment. A 6-0 architect vote confirmed this. Revisit when a second external theme exists.

### But self-documenting code is the right long-term architecture

The Swagger/OpenAPI pattern: `defineLayout()` gains optional `doc` fields (`whenToUse`, `whenNotToUse`, `examples`, `gotchas`, `limits`). A build step generates the skill from code. Single source of truth, no drift. This is decided but not yet implemented.

```typescript
// Future: self-documenting layout
defineLayout({
  name: "cards",
  description: "Card grid with intro text and optional caption.",
  doc: {
    whenToUse: "2-6 peer items (features, benefits, team members)",
    whenNotToUse: "1 item (use statement), 7+ items (split across slides)",
    limits: ["Card descriptions under 80 chars", "3 cards is the sweet spot"],
    gotchas: ["Grid changes with count: 2=1row, 3=1row, 4=2x2, 5-6=2x3"],
  },
  // ... existing params, slots, tokens, render
});
```

### `tycoslide init` is deferred

Was designed to copy skill files from node_modules to .claude/skills/. Solves third-party theme discovery — a problem that doesn't exist yet. For now, a `cp` command in the README is sufficient.

### Theme-as-Entry-Point was rejected

Dissolving the CLI so themes own the binary was explored across 5 architect rounds. Rejected because every ecosystem precedent (Marp, Slidev, Gatsby, etc.) keeps framework separate from theme. CLI stays standalone.

---

## What Skills We Want (Eventually)

### Skill 1: Slide/collateral authoring

**For**: Anyone writing decks or marketing collateral using an installed theme.

What it does:
- Teaches tycoslide markdown syntax, layouts, components, directives
- Layout selection guidance ("three key points → cards, single big number → stat")
- **Deck composition rules and sequence patterns** (see [sequences.md](sequences.md))
- Error translation (build error → fix)
- Build-iterate loop

What it does NOT do:
- Generate slide content
- Offer design opinions
- Work around the build validator

Architecture: One SKILL.md per theme. Theme-specific (layout params, content limits, examples) because tycoslide themes define the entire structural vocabulary — two themes have incompatible layouts.

### Skill 2: Theme bootstrap from existing materials

**For**: Theme authors bootstrapping from existing PDFs/PPTXs.

What it does:
- Scans existing PPTX slides or PDF collateral
- Extracts structural skeletons (layout geometry, spacing, font sizes, colors)
- Generates draft TypeScript layout definitions
- Reduces theme authoring from "write from scratch" to "review and refine"

This is the higher-value skill. The authoring skill can be regenerated from code; the bootstrap skill solves the real onboarding bottleneck.

**Technical notes**: PPTX is structured XML (`ppt/theme/theme1.xml` has color scheme + font definitions). No existing tool does "PPTX in, design tokens out" — this is a real gap.

### Skill 3: Theme skill generator (meta-skill)

**For**: Theme authors generating Skill 1 for their theme.

Reads theme source code (`defineLayout()` calls, token shapes, variant configs) and generates the authoring SKILL.md. We'd use this ourselves for the default theme. Lower priority than Skill 2.

---

## Layout Reference (Reproducible)

A detailed 570-line layout catalog (LAYOUTS.md) was authored for the default theme covering all 14 layouts with params, slots, variants, examples, when-to-use guidance, content limits, and gotchas. It lived in `internal/skills/impl/LAYOUTS.md`.

**This content is reproducible** from:
1. Scanning the theme's `defineLayout()` definitions in `packages/theme-default/src/layouts.ts`
2. Building a deck that exercises every layout (the showcase deck)
3. The `doc` fields on `defineLayout()` once those are implemented

Key content limits worth preserving:

| Layout | Limits |
|--------|--------|
| body | 5-8 bullets max. Use `centered` variant for tables/diagrams. |
| cards | 3 cards is the sweet spot. Descriptions under 80 chars. Grid: 2=1row, 3=1row, 4=2x2, 5-6=2x3. |
| stat | `value` under 6 chars. Always quote in YAML. |
| quote | 2-3 sentences max. |
| statement | 1-2 sentences. Use `:purple[**bold accent**]` for key phrases. |
| two-column | Keep columns roughly equal. Code blocks will overflow. |
| transform | Left and right should be parallel content. Overlay is optional, keep small. |
| agenda | Items are auto-numbered. Don't prefix with numbers. |
| section | 2-5 words for title. |
| title | Only once per deck, first slide. |
| end | Only once per deck, last slide. |

---

## Error Translation (High Value)

The single most valuable piece of any skill. Preserving here:

| Error | AI should do | AI should NOT do |
|-------|-------------|-----------------|
| "Content extends beyond slide bounds" | Reduce content, split across slides | Modify theme font size or margins |
| "Unintentional content overlap" | Reduce content, restructure | Add spacing hacks |
| "Unknown layout / Unknown variant" | Use one from the available list in error | Define a new layout in markdown |
| "Layout params validation failed" | Add the missing required field | Make up a value or skip the field |
| "Missing tokens for component" | Theme issue — tell user | Inject tokens from markdown |
| "Code block has no language specified" | Add language tag after opening fences | Remove the code block |

---

## Distribution Context (for skills)

The SKILL.md format is an open standard across 33+ tools (Claude Code, Cursor, Gemini CLI, Codex CLI, etc.). 2,300+ skills indexed. Key marketplaces: awesome-claude-skills, claudemarketplaces.com, skillsmp.com. frontend-slides got 8.3k stars as a Claude Code skill repo — that's the distribution channel when ready.

---

## What Was Deleted

These files are superseded by this document:
- `internal/skills/skills-architecture.md` — `tycoslide init` design, three-file skill structure
- `internal/skills/skill-design.md` — skills philosophy, manifest architecture, multiple architect rounds
- `internal/skills/skill-manifest.md` — Swagger pattern, self-documenting `defineLayout()`
- `internal/skills/Theme_as_Entry_Point.md` — dissolve CLI proposal (rejected)
- `internal/skills/impl/` — WIP implementation (SKILL.md, LAYOUTS.md, CLI.md, init.ts, init.test.ts)
