# Documentation Update Plan

## Context

User-facing docs (in `docs/`) were last updated Feb 24. The codebase has since added a code component, changed the component/layout registration API from single-step to define-then-register, added 19 layouts to the default theme (docs only mention 3), and evolved the token/schema system.

## Research Completed

A deep codebase scan identified 18 gaps between docs and code. The top two commits (`572a6e1`, `2bab88f`) changed the registration API, and further commits added testimonial component, `--render-scale` CLI flag, and `theme.fonts` manifest.

---

## Gaps to Address

### Critical (docs are wrong / will mislead users)

1. **Component registration API rewrite** — Docs show `componentRegistry.define({...})` throughout. This no longer exists. The new API is `defineComponent({...})` (pure factory) + `componentRegistry.register(def)`. Every code example in `components.md` and `themes.md` that shows component registration needs rewriting.

2. **Layout registration API rewrite** — Same pattern: `layoutRegistry.define({...})` is now `defineLayout({...})` + `layoutRegistry.register(def)`. All examples in `layouts.md` need rewriting.

3. **Theme package contract changed** — Docs show side-effect imports (`import './layouts'`). New contract: themes must export `components` array and `layouts` array. The CLI's `themeLoader` calls `componentRegistry.register(components)` and `layoutRegistry.register(layouts)`. The `themes.md` "Registering Layouts in Themes" section and `layouts.md` cross-references need rewriting.

4. **Code component missing entirely** — New component with Shiki syntax highlighting, `:::code{language="typescript"}` directive, fenced code blocks auto-compile to it (language required), 15 theme tokens (`CodeTokens`), `LANGUAGE` enum with ~200+ entries. Needs a full section in `components.md`.

5. **Testimonial component missing entirely** — New component (split from quote). Needs a full section in `components.md`. Check `packages/components/src/` for its definition, params, tokens, and DSL function.

### Major (significant features undocumented)

6. **19 layouts in theme-default, docs list 3** — `title`, `section`, `body`, `stat`, `quote`, `end`, `blank`, `image`, `image-left`, `image-right`, `two-column`, `comparison`, `statement`, `agenda`, `cards`, `bio`, `caption`, `title-only`, `team`. The `layouts.md` page needs a complete listing.

7. **Component count is 15, not 13** — Summary tables in `components.md` and `README.md` need updating. New since docs were written: code, testimonial.

8. **Components export definition objects** — Each component now exports its definition (e.g., `cardComponent`, `textComponent`) alongside DSL functions. Theme authors need to know about these for the `components` array.

9. **`theme.fonts` manifest** — Commit `28d4aec` added explicit font registration. Check if Theme interface now has a `fonts` field.

10. **`Canvas` escape hatch for custom components** — `ExpansionContext` now has `canvas: Canvas` with `renderHtml(html, transparent?) → Promise<string>`. Canvas renders arbitrary HTML to PNG — use it when something is not natively supported as a PowerPoint object. This is how `mermaid` and `code` work. The existing "Expansion Function" section in `components.md` covers `(props, context, tokens)` but does not mention `canvas`. Add it there — brief explanation, point to mermaid/code as examples, do not over-document the API. Do not mention underlying technologies (Playwright, Chromium, etc.).

### Medium (new features to document)

11. **`schema.content()` and `schema.size()`** — Two new schema helpers not in the component authoring reference table.

12. **`Theme.spacing.lineSpacing`** — New required field in the spacing section of `themes.md`.

13. **CONTENT.RICH vs CONTENT.PROSE behavior** — RICH mode disables block-level constructs at the parser. The gotcha (e.g., `text("1. Item")` renders as plain paragraph, not ordered list) isn't documented.

14. **Shape selective borders** — `borderTop/Right/Bottom/Left` boolean props on shapes.

15. **1-slot directive limitation** — Slotted components in `:::directive` syntax only support 1 slot.

16. **Accent colors are open vocabulary** — `Record<string, string>`, not fixed set of 5.

17. **`--render-scale` CLI flag** — Controls Playwright's deviceScaleFactor for HTML-to-PNG rendering of mermaid diagrams and code blocks. Values: 1 (fast/low quality), 2 (retina, default), 3 (print quality). Optional parameter. Needs documentation in `cli.md`.

### Minor (corrections/clarifications)

18. **Troubleshooting** — Add code component error messages (language required, unknown language).

---

## Files to Update

| File | Scope of Changes |
|------|-----------------|
| `components.md` | Heavy — add code + testimonial components, fix all `componentRegistry.define()` examples, update summary tables (15 components), add `schema.content()`/`schema.size()`, document shape borders, 1-slot limitation, CONTENT.RICH behavior, accent open vocabulary |
| `layouts.md` | Heavy — document all 19 layouts, fix `layoutRegistry.define()` examples to use `defineLayout()` + `register()` |
| `themes.md` | Medium — fix theme package contract (components/layouts arrays), add `lineSpacing`, update registration examples, document `fonts` manifest if applicable |
| `README.md` | Light — update component count, verify quick start still accurate |
| `troubleshooting.md` | Light — add code component errors |
| `introduction.md` | Light — update component count reference if present |
| `quick-start.md` | Light — verify examples still work |
| `markdown-syntax.md` | Light — add fenced code block → code component behavior |
| `cli.md` | Light — document `--render-scale <factor>` flag for HTML-to-PNG rendering |
| `docs/README.md` | None — index page, already accurate |

---

## Agent Team

### Pipeline: Style Guide → Writer → Review → Fix-up

**Phase 0: Deep Research (DONE)**
Codebase scan complete. All 18 gaps identified above.

**Phase 1: Style Extraction (explore-medium agent + copywriter skill)**
Before any writing happens. Agent reads all 8 existing doc files and extracts:
- Writing tone and voice (declarative? tutorial? reference?)
- How code examples are used (frequency, length, what they show vs. omit)
- Document structure patterns (section headings, parameter tables, cross-references)
- Level of detail for different doc types (author-facing vs. developer-facing)
- What gets deferred to source code vs. documented inline
- How content is partitioned across pages (each page owns a topic; no duplication)
- Any anti-patterns to avoid

**MECE principle**: Docs must be mutually exclusive, collectively exhaustive. Each page owns its topic — no content duplicated across pages. Cross-references link, not repeat. The style guide must map which page owns which topic so writers don't create overlap.

Output: writes a **Writing Style Guide** section back into this plan file. This becomes the brief for the writer agents and the checklist for the reviewers.

**Phase 2: Writing (executor-high agent, Opus + copywriter skill)**
A single executor-high agent gets:
- This plan (with style guide from Phase 1) as its brief
- The gap list above as its task list
- Access to source files for API accuracy
- The copywriter skill for prose quality

Works file-by-file through the gaps. Must match the extracted style exactly — no over-documentation, no gratuitous code examples, no tone shifts.

**Phase 3: Review (two parallel agents)**
After writing is done, two reviewers run in parallel:

a. **Technical accuracy reviewer** (code-reviewer agent, Opus) — verifies:
   - Every code example compiles against the actual API
   - No stale references to old APIs (`componentRegistry.define`, `layoutRegistry.define`, side-effect imports)
   - Cross-references between pages are consistent
   - Component counts match everywhere (15)
   - Theme package contract is accurately described

b. **Style and copy reviewer** (explore-medium agent + copywriter skill) — verifies:
   - Tone matches the style guide from Phase 1
   - No over-documentation or unnecessary code examples added
   - New sections match the structure of existing sections
   - No duplicative content across pages
   - Prose is clear, direct, and concise

Both reviewers write their findings to a review report.

**Phase 4: Fix-up (if needed)**
If reviewers find issues, a quick executor pass fixes them.

---

## Writing Style Guide

### Voice and Tone

**Declarative, not tutorial.** The dominant mode is declarative third-person description: "A component definition includes:", "Masters define fixed elements", "The body slot accepts any markdown content." Avoid tutorial constructs like "Now let's", "In this section we'll", "You'll notice that". Second person ("you") appears only sparingly in imperative instructions ("Use this when:", "Test with minimal content").

**Imperative for instructions, declarative for everything else.** Procedures use imperative mood ("Add", "Import", "Define", "Run"). Explanations use declarative mood ("Layouts are defined using", "Components are invoked with", "Spacing values are in inches").

**Formal but not academic.** No contractions. No colloquialisms. No hedging ("This might", "You could consider"). Statements are confident and direct.

**No sells, no preamble.** Sections do not open with praise ("This powerful feature lets you...") or context-setting prose ("Before we dive in, it's important to understand..."). They open with a one-sentence declarative description of what the thing is, then immediately get to content.

**Tight sentences.** Sentences are short and concrete. Subordinate clauses are used when they add essential information, not for variety. No filler.

**Sound like a smart friend.** Use the least words possible. No superfluous adjectives. No overly technical words when a simple one works. Show, don't tell. Never write infrastructure sentences — sentences that exist only to introduce the real information. Bad: "There is a powerful feature called Canvas that you can use to render arbitrary HTML." Good: "Canvas renders arbitrary HTML to PNG — use it when something is not natively supported." Get to the point in the first clause.

**Hide implementation details.** Do not expose underlying technologies in user-facing docs. No references to pptxgenjs, Playwright, Chromium, Shiki, Puppeteer, or other internal dependencies. Users do not need to know how things work under the hood — they need to know what to type and what happens. Users do not need to know that a browser is involved at all. They need to know: "you can render arbitrary HTML to PNG." That is the user-facing abstraction. Say "renders to PNG" not "renders via Shiki to PNG using Playwright." Say "measured and positioned" not "measured via Playwright-based HTML measurement." The **only** internal technology name acceptable in docs is **Mermaid** — the component is deliberately named `mermaid` because the syntax is specific to that tool, so the name is user-facing, not an implementation leak. All other internal names are banned. Implementation details belong in CLAUDE.md and source comments, not in docs. Existing violations to fix: `introduction.md:67` ("Playwright-based"), `components.md:68` and `:426` ("mermaid-cli").

---

### Code Example Conventions

**Minimal by design. The example theme IS the example.** The existing documentation uses code examples sparingly — not dense. Each component section has 2–4 code blocks at most. The default theme's source (`packages/theme-default/src/theme.ts`, `layouts.ts`) is the canonical reference, linked rather than repeated. Writers must resist the urge to document every possible combination.

**Code blocks show the essential case, not every variation.** A component section shows: (1) the simplest directive invocation, and optionally (2) one variant or param combination that illustrates a non-obvious feature. It does not show 5 variations of the same pattern.

**No import boilerplate unless imports are the point.** A markdown code block showing a directive (`:::card{title="X"}`) has no preamble. A TypeScript code block showing component registration shows the relevant imports because they are part of what changes. A code block showing DSL usage inside a layout does not repeat the same imports already shown two blocks earlier in the same section.

**Do not show full files.** Code blocks show the relevant fragment, not a complete working file. Exception: the `themes.md` step-by-step guide and the "Complete Example" in `components.md` show more complete fragments because they are explicitly labeled as such.

**Markdown and TypeScript examples serve different audiences.** Markdown directive examples (author-facing) are short — 3–8 lines. TypeScript examples (developer-facing) can be longer — 15–40 lines for complete component or layout definitions. Never mix both in the same block.

**No comments explaining what the code does when prose already does it.** Comments in code blocks are used sparingly: to label sections of a longer block ("// 1. Define token constants", "// 2. Define and register component"), or to show default values inline. They are not used to restate what the surrounding prose already says.

**Language tags are always present** on fenced code blocks: `bash`, `markdown`, `typescript`, `typescript`. Never use ` ``` ` without a language.

---

### Document Structure

**Page opening: one declarative sentence.** Every page opens with a single declarative sentence under the H1, describing what the page covers. Examples: "Learn the essential Markdown syntax for authoring tycoslide presentations.", "Layouts define the structure and visual arrangement of a slide — where the title goes, where body content renders, and what fixed elements like footers appear."

**H2 sections, H3 subsections, H4 sub-subsections.** The hierarchy is consistent. H2 for major sections (component names, top-level topics). H3 for subsections within a component ("Parameters", "Content Modes", "Examples"). H4 for further subdivision ("Declaring Tokens", "Providing Tokens in a Theme"). No H5.

**Component/layout section pattern — always this order:**
1. One-sentence description of the component/layout (what it is, what it produces)
2. Any critical notes (bold, no prefix like "Note:" — just stated directly)
3. `### Parameters` table: `Param | Type | Description` columns
4. Additional subsections if needed (e.g., `### Content Modes`, `### Class Names`)
5. `### Example` or `### Examples` with 1–3 code blocks
6. `---` horizontal rule to close the section

**Parameter tables use three columns: Param | Type | Description.** Required params are marked `(**required**)` in the Description field. Optional params have no marker (absence of "required" means optional). Default values appear in the Description: "(default: `fill`)". The Type column uses the actual type name or union, e.g., `fill \| hug`, `string`, `number`, not vague placeholders.

**"Best Practices" sections use bold lead-ins, not bullets with prose.** The pattern is:
```
**Keep components focused:**
- One clear purpose per component
- Minimal required props
```
Not paragraph prose. Not nested bullet points beyond one level.

**"When to create X" sections use bullet lists with no preamble sentence.** They open directly with the list.

**Cross-references use inline links with brief anchor text.** Format: `See [Components — Defining Parameters](./components.md#defining-parameters).` Not: "For more information about parameters, you can refer to the components documentation page which explains this in detail." Anchor text describes the specific section, not the page.

**"Related" sections at page bottom use a simple list.** Format:
```
- [Quick Start](./quick-start.md) - Your first presentation
- [Components](./components.md) - Component reference and custom components
```
Dash separator, brief description. No full stops.

**Horizontal rules (`---`) separate major component entries** within a single page (e.g., between each component section in `components.md`). They are not used within a single component's subsections.

---

### Level of Detail

**Author-facing content (markdown-syntax.md, quick-start.md) is shallow.** It shows what to type and what happens. It does not explain internal mechanics. It defers immediately to other pages: "For component directives and parameters, see [Components](./components.md)."

**Developer-facing content (custom sections in components.md, layouts.md, themes.md) is deeper.** It documents the TypeScript API, schema helpers, token system, slot mechanics, and testing approach. But even here: "See [source file] for the complete reference" is the pattern when full enumeration would be exhaustive. The `theme.ts` source is explicitly pointed to for all token keys rather than listed inline.

**When a subsection has a complete reference implementation, link it.** Format: "See [`theme.ts`](../packages/theme-default/src/theme.ts) for the complete reference implementation with all token keys and default values." Used in `themes.md` and `troubleshooting.md`. Writers must use this pattern instead of reproducing all token keys inline.

**Error messages are quoted verbatim in troubleshooting.** Each error entry shows the exact error string in a plain code block (no language tag), then **Cause:** and **Fix:** in bold. No "Note:", no callout boxes.

**Troubleshooting "Fix" entries are short.** They state the fix and show only the necessary code. If a fix requires a code example, it is 3–10 lines. They do not re-explain concepts already covered in the main docs — they link instead.

---

### Content Partitioning (MECE Rules)

Each page owns its topic. Writers must not write content that belongs on another page.

| Topic | Owned by |
|-------|----------|
| What tycoslide is, philosophy, comparison to alternatives | `introduction.md` |
| Install, first build, editor setup | `quick-start.md` |
| Frontmatter, slide separators, text formatting, lists, tables (GFM), speaker notes | `markdown-syntax.md` |
| Directive syntax, built-in component reference (params + examples), custom component authoring, DSL functions, token system, expansion function | `components.md` |
| Built-in layout reference (params + examples), custom layout authoring, slot mechanics, masters, testing layouts | `layouts.md` |
| Theme structure, color/font/spacing/border/component token configuration, variants system, font requirements, registering layouts in themes, testing themes | `themes.md` |
| CLI flags, exit codes, debug workflow | `cli.md` |
| Error messages, causes, fixes, debug tools | `troubleshooting.md` |
| Install + minimal example (3-slide) | `README.md` |

**Cross-reference, never duplicate.** If `layouts.md` needs to mention parameter schema helpers, it links to `components.md#defining-parameters`. It does not re-document the schema helpers. If `themes.md` needs to mention layout registration, it says "For how to package layouts with your theme entry point, see [Themes — Registering Layouts in Themes](./themes.md#registering-layouts-in-themes)" (as the current `layouts.md` does).

**The "Common Patterns" section in `components.md` is the one place for multi-component usage examples.** Individual component sections show that component in isolation. Patterns that combine multiple components (row + card, column + quote + text) belong in Common Patterns.

**Directive syntax lives in `components.md` only.** `markdown-syntax.md` mentions that directives exist and cross-references `components.md`. It does not duplicate the syntax explanation.

**GFM table syntax lives in `markdown-syntax.md` only.** `components.md` mentions that `:::table` directive body uses GFM syntax without re-explaining GFM. The `:::table` component itself (styled tables) lives in `components.md`.

---

### Anti-Patterns to Avoid

**No emoji.** None appear anywhere in the existing documentation.

**No callout boxes.** No "Note:", "Warning:", "Tip:", "Important:" prefix boxes or blockquotes used as callouts. Critical information is stated directly in prose or as a bold standalone sentence.

**No lengthy "why" explanations.** The docs state what things do and how to use them. They do not explain the engineering rationale or design history. Exception: `introduction.md` is explicitly the "why" page — but only there.

**No "In this section, we will..." preamble.** Sections open with content, not announcements about what is coming.

**No "As mentioned earlier" or "As we saw above."** Each section stands alone. Cross-references use links, not prose callbacks.

**No tables for things that are short bullet lists.** The "Good fit / Not a good fit" in `introduction.md` uses bullet lists. The "When to create" sections use bullet lists. Tables are for structured multi-column data (params, component summaries, comparisons).

**No passive voice for instructions.** "The body slot accepts..." (active) not "The body slot is used to accept..." (passive). "Add the missing field to the slide frontmatter." (active imperative) not "The missing field should be added..." (passive).

**No over-specifying the obvious.** `quick-start.md` says "Create a file called `slides.md`" and immediately gives the content. It does not say "You will need to use your preferred text editor or IDE to create a new file. Make sure to save it with the .md extension."

**No restating the component name in its description.** "Content card with an optional image, title, and description." Not "The card component is a content card that...".

**No "currently" or "at this time."** These phrases date documentation. State facts as facts.

**Do not list every possible value when the type already communicates it.** "6-character hex strings without a `#` prefix" explains the format once. It does not list 20 example colors.

---

### Topic Ownership Map (detailed)

This map tells writers exactly which page to edit for each gap in the gap list.

| Gap # | Content | File |
|-------|---------|------|
| 1 | Component registration API (`defineComponent` + `register`) | `components.md` — "Component Registration" subsection |
| 2 | Layout registration API (`defineLayout` + `register`) | `layouts.md` — "Layout Registration" subsection |
| 3 | Theme package entry point contract (`components` + `layouts` arrays) | `themes.md` — "Registering Layouts in Themes" section |
| 4 | Code component (full section: params, tokens, directive, DSL) | `components.md` — new section after mermaid |
| 5 | Testimonial component (full section: params, tokens, directive, DSL) | `components.md` — new section |
| 6 | All 19 layouts in theme-default | `layouts.md` — "Available Layouts" table + new layout sections |
| 7 | Component count (15, not 13) | `components.md` summary tables + `README.md` header |
| 8 | Component definition objects exported alongside DSL functions | `components.md` — "Component Registration" + `themes.md` — entry point section |
| 9 | `theme.fonts` manifest | `themes.md` — add subsection if field is present in Theme interface |
| 10 | `canvas.renderHtml()` on `ExpansionContext` | `components.md` — "Expansion Function" subsection |
| 11 | `schema.content()` and `schema.size()` | `components.md` — "Defining Parameters" table |
| 12 | `Theme.spacing.lineSpacing` | `themes.md` — "Define Spacing" subsection |
| 13 | CONTENT.RICH vs CONTENT.PROSE parser behavior | `components.md` — "Content Modes" subsection of text component |
| 14 | Shape selective borders (`borderTop/Right/Bottom/Left`) | `components.md` — shape "Parameters" table |
| 15 | 1-slot directive limitation | `components.md` — "Content Slots" subsection |
| 16 | Accent colors are open vocabulary | `themes.md` — colors section; `markdown-syntax.md` — "Inline Accents" |
| 17 | `--render-scale` CLI flag | `cli.md` — new option under `tycoslide build` |
| 18 | Code component error messages | `troubleshooting.md` — new subsection under Component Errors |

---

## Key API Changes Reference (for writer agent)

### Old → New: Component Registration

```typescript
// OLD (docs currently show this — WRONG)
componentRegistry.define({
  name: 'badge',
  params: { label: schema.string() },
  tokens: ['backgroundColor', 'textColor'],
  expand: (props, context, tokens) => { ... },
});

// NEW (correct)
import { defineComponent, componentRegistry } from 'tycoslide';

export const badgeComponent = defineComponent({
  name: 'badge',
  params: { label: schema.string() },
  tokens: ['backgroundColor', 'textColor'],
  expand: (props, context, tokens) => { ... },
});

// Registration happens in the theme:
componentRegistry.register(badgeComponent);
// Or: componentRegistry.register([badgeComponent, otherComponent, ...]);
```

### Old → New: Layout Registration

```typescript
// OLD (docs currently show this — WRONG)
layoutRegistry.define({
  name: 'two-column',
  description: 'Two columns',
  params: { title: textComponent.schema.optional() },
  slots: ['left', 'right'],
  render: (props) => ({ ... }),
});

// NEW (correct)
import { defineLayout, layoutRegistry } from 'tycoslide';

export const twoColumnLayout = defineLayout({
  name: 'two-column',
  description: 'Two columns',
  params: { title: textComponent.schema.optional() },
  slots: ['left', 'right'],
  render: (props) => ({ ... }),
});

// Registration happens in the theme:
layoutRegistry.register(twoColumnLayout);
```

### Old → New: Theme Package Entry Point

```typescript
// OLD (docs currently show this — WRONG)
// my-theme/index.ts
import './layouts';  // Side-effect registration
export { theme } from './theme';

// NEW (correct)
// my-theme/index.ts
import { cardComponent, textComponent, ... } from 'tycoslide-components';
import { allLayouts } from './layouts.js';

export const components = [cardComponent, textComponent, ...];
export const layouts = allLayouts;
export { theme } from './theme.js';
```

### ExpansionContext

```typescript
// OLD: context.render or RenderService
// NEW: context.canvas: Canvas
export interface Canvas {
  renderHtml(html: string, transparent?: boolean): Promise<string>;
}
```
