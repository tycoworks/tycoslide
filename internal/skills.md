# Slide Authoring Skill

Design doc for the tycoslide slide authoring skill — a Claude Code / Cowork skill that teaches AI agents to author markdown slide decks using tycoslide's theme system.

**Status**: Design complete. Implementation not started.

---

## 1. Goal & Bright Line

The skill is a **compiler reference, not a design advisor**. It teaches tycoslide's markdown dialect — valid syntax, template selection, build commands, error recovery. Creative decisions (content, narrative, tone) are the user's and base model's responsibility.

**The bright line**: Does this require knowledge of tycoslide's syntax, build system, or theme architecture? Yes — skill handles it. No — user's problem.

What it does:
- Teaches tycoslide markdown syntax, templates, components, directives
- Template selection guidance ("three key points → cards, single big number → stat")
- Deck composition rules and sequence patterns
- Error translation (build error → fix)
- Build-iterate loop

What it does NOT do:
- Generate slide content
- Offer design opinions
- Work around the build validator

---

## 2. Architecture: Theme-as-Skill-Host

Two layers:

**SDK generic framework** (lives in tycoslide repo):
- Markdown syntax reference (frontmatter, directives, components)
- Build commands and CLI reference
- Error translation table
- Composition rules and sequence patterns
- These are theme-agnostic — they work with any tycoslide theme

**Theme-specific skill** (ships inside each theme npm package):
- Template reference (names, descriptions, params, content limits, when-to-use)
- Theme-specific examples and gotchas
- Compiled from the generic framework + theme metadata

The theme npm package IS the distribution mechanism. `npm install @company/theme-brand` gives you the theme AND the skill.

The skill instructs the agent to introspect the installed theme at runtime:
1. Read the theme's format file to discover available templates
2. Extract template names, descriptions, params from `defineTemplate()` calls
3. Use this metadata to select appropriate templates

**Why theme-specific**: Themes define the entire structural vocabulary — two themes have incompatible layouts, different template names, different params. A generic skill would be too vague to be useful.

---

## 3. Agent Workflow — 5 Phases

| Phase | Action | Agent does |
|-------|--------|-----------|
| 1. Detect | Recognize slide authoring intent | Triggers on "deck", "slides", "presentation", ".md" for tycoslide |
| 2. Discover | Read installed theme's templates | Scan `defineTemplate()` calls, extract names/descriptions/params |
| 3. Compose | Plan deck structure | Select sequence pattern, map content to templates, outline slide order |
| 4. Build | Write markdown + compile | Write `.md` file, run `npx tycoslide build deck.md`, read output |
| 5. QA | Error-based iteration | Read build errors, fix, rebuild until clean |

### Phase 1: Detect

The skill activates when the user's request implies slide authoring. Trigger signals:
- Explicit: "create a deck", "build slides", "make a presentation"
- File-based: working with `.md` files in a tycoslide project (has tycoslide in dependencies)
- Context: references to templates, layouts, or slide-specific vocabulary

### Phase 2: Discover

The agent reads the installed theme to build a runtime template catalog. Steps:
1. Find the theme package (from `package.json` dependencies or `theme:` frontmatter)
2. Read the theme's format files (e.g., `src/formats/presentation.ts`, `src/formats/factsheet.ts`)
3. Extract from each `defineTemplate()` call: name, description, params schema, background variant
4. Build an internal lookup: template name → description + params + constraints

This replaces a static template reference with live introspection. The skill never hardcodes template names — it reads them from the theme.

### Phase 3: Compose

Before writing any markdown, the agent plans the deck structure:
1. Identify the rhetorical goal (inform, persuade, compare, narrate)
2. Select a sequence pattern (SCR, Feature Tour, Data Story — see [Section 5](#5-composition-rules))
3. Map each content block to a template from the discovered catalog
4. Check rhythm rules (no same-layout back-to-back, breathing slides between dense ones)
5. Output a slide outline: `[title, body, cards, stat, quote, section, ...]`

### Phase 4: Build

Write the `.md` file and compile:

```bash
npx tycoslide build deck.md          # outputs deck.pptx
```

The agent writes markdown following the syntax reference (see [Section 10](#10-planned-skill-file-structure), `references/syntax.md`). Key rules:
- Global frontmatter: `theme:` and `format:` are required
- Per-slide frontmatter: `template:` selects the layout, other fields are template-specific params
- Slide separator: `---` on its own line
- Directives for structured content: `:::card`, `:::quote`, `:::code`, etc.

### Phase 5: QA

**Error-based QA only.** No visual inspection needed.

tycoslide's build validator catches:
- Content overflow (text extends beyond slide bounds)
- Unintentional content overlap
- Unknown templates
- Missing required params
- Missing tokens for components

The QA loop: build → read errors → fix → rebuild → repeat until clean.

**Why no visual QA**: The Anthropic pptx skill needs visual QA because pptxgenjs has no validator — overlaps are silent failures. tycoslide's validator catches these at build time. Visual QA would require LibreOffice + pdftoppm dependencies that add complexity without proportional value.

---

## 4. Error Translation

The single most valuable piece of any skill. When the build fails, the agent needs to know what to do — and what NOT to do.

| Error | Agent should do | Agent should NOT do |
|-------|----------------|-------------------|
| "Content extends beyond slide bounds" | Reduce content, split across slides | Modify theme font sizes or margins |
| "Unintentional content overlap" | Reduce content, restructure | Add spacing hacks |
| "Unknown layout / Unknown variant" | Use one from the available list in error | Define a new layout in markdown |
| "Layout params validation failed" | Add the missing required field | Make up a value or skip the field |
| "Missing tokens for component" | Theme issue — tell user | Inject tokens from markdown |
| "Code block has no language specified" | Add language tag after opening fences | Remove the code block |

The pattern: **the agent fixes content, never modifies theme behavior**. Build errors are guardrails, not obstacles. When the validator says content doesn't fit, the correct response is always to reduce or restructure — never to weaken the constraints.

---

## 5. Composition Rules

Deck composition is the difference between syntactically correct slides and a coherent presentation. These rules encode the patterns from `internal/sequences.md`.

### Sequence Patterns

**Argumentative**

| Name | Pattern | Typical Template Progression |
|------|---------|------------------------------|
| **SCR** (McKinsey) | Situation → Complication → Resolution | body → statement → cards |
| **SCQA** (Minto Pyramid) | Situation → Complication → Question → Answer | body → body → statement → cards |
| **Problem-Solution-Proof** | Problem → Solution → Evidence | body → cards → stat + quote |
| **AIDA** | Attention → Interest → Desire → Action | stat → body ×3 → cards → statement(CTA) |

**Narrative**

| Name | Pattern | Typical Template Progression |
|------|---------|------------------------------|
| **Case Study** | Context → Challenge → Solution → Result | body → statement → cards → stat |
| **Before/After** | Old way → Transformation → New way | transform → statement → cards |
| **StoryBrand SB7** | Character → Problem → Guide → Plan → CTA → Stakes → Vision | body → statement → cards → agenda → statement → body → statement |

**Structural**

| Name | Pattern | Typical Template Progression |
|------|---------|------------------------------|
| **Feature Tour** | Overview → [Feature ×N] | agenda → [section → cards → body] ×N |
| **Comparison** | Ours vs theirs → Proof points | transform → stat → quote |
| **Data Story** | Context → Metric → Interpretation | body → stat → statement |

**Framing**

| Name | Pattern | Typical Template Progression |
|------|---------|------------------------------|
| **Opening** | Hook → Agenda → Positioning | title → agenda → statement |
| **Closing** | Summary → Social proof → CTA | cards → quote → title-dark |
| **Section Transition** | Divider → Context | section → body |

### Layout Selection by Content Type

| Content shape | Template |
|---------------|----------|
| Single impressive number | stat |
| 2-6 parallel items | cards |
| One big idea, no details | statement |
| Someone else's words | quote |
| Step-by-step or agenda items | agenda |
| Side-by-side comparison | transform |
| Everything else | body |

### Rhythm Rules

- **Never** use the same template back-to-back
- Alternate between dense slides (body, cards, transform) and breathing slides (statement, stat, quote, section)
- Insert a section divider every 3-5 content slides in decks > 8 slides

### Anti-Patterns

- Don't use body for everything (most common AI failure)
- Don't put 3 statement slides in a row
- Don't skip section dividers in long decks
- Don't use cards with 1 item (use statement) or 7+ items (split across slides)

---

## 6. Template Metadata

### Today

`defineTemplate()` accepts `name`, `description`, `layout`, `background`, `tokens`. The description is a single sentence.

Current theme-default templates (9 templates):

| Template | Description |
|----------|-------------|
| title | Opening slide with large title and optional subtitle |
| title-dark | Closing slide. Dark variant of the title layout |
| section | Section divider with centered title |
| body | Markdown body with optional title. Default layout |
| body-centered | Centered markdown body with optional title |
| statement | Centered body text with optional caption. Use for value props |
| agenda | Eyebrow, title, and numbered item list with divider lines |
| cards | Card grid with intro text and optional caption |
| transform | Side-by-side comparison layout with optional overlay |

### Planned: Self-Documenting `doc` Field

Add `doc` field to `defineLayout()`:

```typescript
defineLayout({
  name: "cards",
  description: "Card grid with intro text and optional caption.",
  doc: {
    whenToUse: "2-6 peer items (features, benefits, team members)",
    whenNotToUse: "1 item (use statement), 7+ items (split across slides)",
    limits: ["Card descriptions under 80 chars", "3 cards is the sweet spot"],
    gotchas: ["Grid changes with count: 2=1row, 3=1row, 4=2x2, 5-6=2x3"],
  },
});
```

A build step compiles these `doc` fields into the skill's template reference. Single source of truth, no drift.

### v1: Hardcoded Content Limits

Until `doc` fields ship, the skill hardcodes content limits:

| Template | Limits |
|----------|--------|
| body | 5-8 bullets max |
| cards | 3 is sweet spot. Descriptions under 80 chars. Grid: 2=1row, 3=1row, 4=2x2, 5-6=2x3 |
| statement | 1-2 sentences. Use `:accent[**bold**]` for key phrases |
| quote | 2-3 sentences max |
| agenda | Items auto-numbered. Don't prefix with numbers |
| section | 2-5 words for title |
| title | Only once per deck, first slide |
| title-dark | Only once per deck, last slide |
| transform | Keep columns roughly equal. Overlay optional, keep small |

---

## 7. Distribution & Cowork

### Distribution Model

Theme npm package includes skill files:

```
@company/theme-brand/
  package.json
  dist/                    # compiled theme
  src/                     # theme source
  .claude/skills/tycoslide/
    SKILL.md
    references/
      syntax.md
      composition.md
      errors.md
      cli.md
```

### Installation

```bash
npm install @company/theme-brand
cp -r node_modules/@company/theme-brand/.claude/skills/tycoslide .claude/skills/
```

A future `tycoslide init` would automate both steps.

### Theme Hosting Options

For private/enterprise themes:

| Method | Trade-off |
|--------|-----------|
| Git URL (`npm install git+https://...`) | Simplest, no registry needed |
| GitHub Packages (`npm.pkg.github.com`) | Private npm registry, GitHub-native |
| npm private packages | Paid npm org with `@company` scope |
| Local path (`npm install ../theme-brand`) | Development only |

### Cowork Enterprise

The target experience: admin installs skill at workspace level, any team member says "create a deck about Q3 results", agent produces on-brand PPTX.

Open questions:
- Does the Cowork agent environment have npm? If yes, agent can `npm init` + `npm install` the theme
- Can a workspace admin configure a project template with the theme pre-installed?
- Should the skill be fully self-contained (bundled theme, zero npm needed) for constrained environments?
- How do workspace-level skills reference external dependencies?

---

## 8. Competitive Context

### Anthropic pptx skill

The benchmark. SKILL.md + pptxgenjs.md + editing.md + scripts/. Key strengths: comprehensive visual QA loop (render → screenshot → inspect → fix), strong design guidance (color palettes, typography, spacing). Key difference from tycoslide: pptxgenjs is a low-level API (agent places every element), tycoslide is a high-level system (themes handle visual design, agent writes content). tycoslide's skill can be simpler because the theme does the heavy lifting.

### deckdown

CLI scaffold (`deckdown init`), localhost studio editor, AGENTS.md for agentic pipelines. Positioning: "repo-native authoring." The studio editor with real-time diagnostics is interesting. tycoslide doesn't have an editor (yet), but the build-error loop serves the same purpose for agents.

### frontend-slides

6-phase workflow, zero-dependency single HTML files, emphasis on style discovery. The style discovery phase (show 3 previews, let user pick) is clever but irrelevant for tycoslide — the theme IS the style. The phased workflow structure (detect → discover → generate → deliver) is a good pattern we adopted.

### Key Insight

tycoslide's skill can be **simpler than all three** because:
1. The theme handles all visual design (no color palette selection, no font pairing, no layout positioning)
2. The validator handles QA (no visual inspection needed)
3. The skill only teaches syntax and composition

---

## 9. Planned Skill File Structure

```
.claude/skills/tycoslide/
  SKILL.md                 — Main entry point (~200 lines)
    - Metadata (name, triggers)
    - Quick reference table
    - 5-phase workflow
    - Theme introspection instructions
    - Build & iterate loop
    - QA checklist
  references/
    syntax.md              — Markdown dialect reference
      - Global frontmatter (theme, format)
      - Per-slide frontmatter (template, title, notes, eyebrow)
      - Directives (card, quote, code, mermaid, table, list, image)
      - Inline accents
      - Content limits per component
    composition.md         — Deck composition
      - Sequence patterns (from sequences.md)
      - Layout selection heuristics
      - Rhythm rules
      - Anti-patterns
      - Template reference table (theme-specific)
    errors.md              — Error → fix table
    cli.md                 — Build commands + debug flags
```

### SKILL.md Sketch

The main file is the agent's entry point. It should be concise — ~200 lines — and link to reference files for depth. Structure:

```markdown
---
name: tycoslide
description: Author markdown slide decks using tycoslide themes
triggers:
  - "deck"
  - "slides"
  - "presentation"
  - "tycoslide"
---

# tycoslide Slide Authoring

[Quick reference table — templates, params, content limits]

## Workflow
1. Discover: read installed theme for available templates
2. Compose: plan deck structure using sequence patterns
3. Build: write .md, run `npx tycoslide build deck.md`
4. QA: read build errors, fix, rebuild until clean

## Theme Introspection
[Instructions for reading defineTemplate() calls]

## Syntax Quick Reference
[Frontmatter, directives, components — link to references/syntax.md]

## Error Recovery
[Top 5 errors inline, link to references/errors.md]
```

---

## 10. Skill Conflict Resolution

If a user has both the Anthropic pptx skill and the tycoslide skill installed, Claude sees both in context and must decide which to use. There is no built-in conflict resolution in the SKILL.md standard — disambiguation is entirely via the `description` field.

**How to avoid conflicts**:

| Signal | Anthropic pptx skill | tycoslide skill |
|--------|---------------------|-----------------|
| Trigger keywords | "pptx", "PowerPoint", "pptxgenjs" | "tycoslide", "tycoslide build", theme names |
| File context | `.pptx` files, no `package.json` with tycoslide | `.md` files, `@tycoslide/` in deps |
| Intent | Create PPTX from scratch with code | Write markdown that compiles to PPTX via themes |

The description field should be specific enough that Claude can distinguish. The Anthropic skill-creator has a "description optimization" phase that tests triggering accuracy with 20 near-miss queries — we should use this during skill development.

**Open question**: What happens in a Cowork workspace with BOTH skills? The admin may need to configure priority or the skills need to be explicit about when NOT to trigger ("If the project uses tycoslide, do not use this skill").

---

## 11. Eval Methodology

Use the [Anthropic skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) for structured eval and iteration.

### Process

1. **Write skill** — SKILL.md + reference files
2. **Define test cases** — 5-10 prompts covering the skill's scope
3. **Parallel eval runs** — with-skill vs. baseline (no skill)
4. **Assert & grade** — objectively verifiable assertions per test case
5. **Review** — eval viewer shows outputs, grades, benchmark data
6. **Improve** — iterate on skill prose based on failures
7. **Optimize description** — test triggering accuracy with 20 queries (10 should-trigger, 10 should-not)

### Test Cases for tycoslide Skill

| Eval | Prompt | Key assertions |
|------|--------|---------------|
| basic-deck | "Create a 5-slide product pitch for a task management app" | Uses varied templates, builds clean, no body-only |
| template-selection | "Make a slide comparing two approaches" | Uses transform or two-column, not body |
| sequence-pattern | "Build a problem-solution-proof deck about cloud migration" | Follows SCR/PSP pattern, correct template progression |
| error-recovery | "Create a deck" (with intentionally overflow-prone content) | Agent reads build error, reduces content, rebuilds clean |
| theme-introspection | "Create a deck using the installed theme" (custom theme) | Agent reads theme files to discover templates, doesn't hardcode theme-default names |
| long-deck | "Create a 15-slide company overview" | Uses section dividers, varied layouts, rhythm rules |
| near-miss-no-trigger | "Create a PowerPoint about sales" (no tycoslide in project) | Skill should NOT trigger |

### Workspace Structure

```
tycoslide-skill-workspace/
  iteration-1/
    eval-basic-deck/
      with_skill/outputs/
      without_skill/outputs/
      grading.json
    benchmark.json
    feedback.json
  iteration-2/
    ...
```

### Description Optimization Queries

Should-trigger (10): "create a tycoslide deck", "build slides from markdown", "make a presentation with theme-default", etc.

Should-NOT-trigger (10): "create a PowerPoint", "make Google Slides", "build a PDF report", "design a Figma mockup", etc.

Near-misses matter most — "create a markdown presentation" should trigger, "create a PowerPoint from markdown" should not.

---

## 12. Open Questions

1. **Self-documenting `defineLayout()` `doc` field** — When to implement? Blocked on having a second theme (to validate the schema). For v1, hardcode the content limits in the skill.

2. **PNG template previews** — Probably never needed. Text descriptions + when-to-use guidance are sufficient for LLMs. PNG previews would require image analysis capability that not all skill consumers have.

3. **Sequences as code vs. skill prose** — Start as skill prose (composition.md). Graduate to theme-level declarations if the pattern proves valuable. See `internal/sequences.md` for the full analysis.

4. **Cowork enterprise dependency model** — How do workspace skills handle npm dependencies? This needs to be tested against real Cowork enterprise environments.

5. **Skill compilation build step** — When theme has `doc` fields on `defineLayout()`, a build step could compile the skill automatically (like Swagger/OpenAPI generates docs from code). Design this when the `doc` field ships.

6. **`tycoslide init` command** — Scaffolds project + installs theme + copies skill. Needed for smooth Cowork setup. Defer until skill is validated.

7. **Multi-format awareness in composition** — Sequence patterns are format-aware. A "Problem-Solution-Proof" sequence for a presentation (16:9) uses different templates than the same narrative arc for a fact sheet (US letter). The skill needs to account for this — either by having format-specific composition rules or by letting the agent adapt the generic patterns based on the discovered template catalog.

8. **Edit skill** — This doc covers creation. Editing existing decks (add a slide, reorder, change template, update content) is a separate skill with different triggers and workflow. Design separately.
