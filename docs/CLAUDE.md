# Documentation Style Guide

This file guides documentation work in the `docs/` directory. It is automatically loaded by Claude Code when editing docs. Follow every rule here when writing, editing, or reviewing any file under `docs/`.

---

## Voice and Tone

**Declarative, not tutorial.** The dominant mode is declarative third-person description: "A component definition includes:", "Masters define fixed elements", "The body slot accepts any markdown content." Avoid tutorial constructs like "Now let's", "In this section we'll", "You'll notice that". Second person ("you") appears only sparingly in imperative instructions ("Use this when:", "Test with minimal content").

**Imperative for instructions, declarative for everything else.** Procedures use imperative mood ("Add", "Import", "Define", "Run"). Explanations use declarative mood ("Layouts are defined using", "Components are invoked with", "Spacing values are in inches").

**Formal but not academic.** No contractions. No colloquialisms. No hedging ("This might", "You could consider"). Statements are confident and direct.

**Protective, not punitive.** Frame build-time checks as helpful, not restrictive. Say "catches" or "surfaces" instead of "fails." Say "handled automatically" instead of "locked" or "enforced." The tool removes effort from the author, not freedom.

**No sells, no preamble.** Sections do not open with praise ("This powerful feature lets you...") or context-setting prose ("Before we dive in, it's important to understand..."). They open with a one-sentence declarative description of what the thing is, then immediately get to content.

**Tight sentences.** Sentences are short and concrete. Subordinate clauses are used when they add essential information, not for variety. No filler.

**Sound like a smart friend.** Use the least words possible. No superfluous adjectives. No overly technical words when a simple one works. Show, don't tell. Never write infrastructure sentences — sentences that exist only to introduce the real information. Bad: "There is a powerful feature called Canvas that you can use to render arbitrary HTML." Good: "Canvas renders arbitrary HTML to PNG — use it when something is not natively supported." Get to the point in the first clause.

**Hide implementation details.** Do not expose underlying technologies in user-facing docs. No references to pptxgenjs, Playwright, Chromium, Shiki, Puppeteer, or other internal dependencies. Users do not need to know how things work under the hood — they need to know what to type and what happens. Users do not need to know that a browser is involved at all. They need to know: "you can render arbitrary HTML to PNG." That is the user-facing abstraction. Say "renders to PNG" not "renders via Shiki to PNG using Playwright." Say "measured and positioned" not "measured via Playwright-based HTML measurement." The **only** internal technology name acceptable in docs is **Mermaid** — the component is deliberately named `mermaid` because the syntax is specific to that tool, so the name is user-facing, not an implementation leak. All other internal names are banned. Implementation details belong in CLAUDE.md and source comments, not in docs.

---

## Code Example Conventions

**Minimal by design. The example theme IS the example.** The existing documentation uses code examples sparingly — not dense. Each component section has 2–4 code blocks at most. The default theme's source (`packages/theme-default/src/theme.ts`, `layouts.ts`) is the canonical reference, linked rather than repeated. Writers must resist the urge to document every possible combination.

**Code blocks show the essential case, not every variation.** A component section shows: (1) the simplest directive invocation, and optionally (2) one variant or param combination that illustrates a non-obvious feature. It does not show 5 variations of the same pattern.

**No import boilerplate unless imports are the point.** A markdown code block showing a directive (`:::card{title="X"}`) has no preamble. A TypeScript code block showing component registration shows the relevant imports because they are part of what changes. A code block showing DSL usage inside a layout does not repeat the same imports already shown two blocks earlier in the same section.

**Do not show full files.** Code blocks show the relevant fragment, not a complete working file. Exception: the `themes.md` step-by-step guide and the "Complete Example" in `components.md` show more complete fragments because they are explicitly labeled as such.

**Markdown and TypeScript examples serve different audiences.** Markdown directive examples (author-facing) are short — 3–8 lines. TypeScript examples (developer-facing) can be longer — 15–40 lines for complete component or layout definitions. Never mix both in the same block.

**No comments explaining what the code does when prose already does it.** Comments in code blocks are used sparingly: to label sections of a longer block ("// 1. Define token constants", "// 2. Define and register component"), or to show default values inline. They are not used to restate what the surrounding prose already says.

**Language tags are always present** on fenced code blocks: `bash`, `markdown`, `typescript`, `typescript`. Never use ` ``` ` without a language.

---

## Document Structure

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

## Level of Detail

**Author-facing content (markdown-syntax.md, quick-start.md) is shallow.** It shows what to type and what happens. It does not explain internal mechanics. It defers immediately to other pages: "For component directives and parameters, see [Components](./components.md)."

**Developer-facing content (custom sections in components.md, layouts.md, themes.md) is deeper.** It documents the TypeScript API, schema helpers, token system, slot mechanics, and testing approach. But even here: "See [source file] for the complete reference" is the pattern when full enumeration would be exhaustive. The `theme.ts` source is explicitly pointed to for all token keys rather than listed inline.

**When a subsection has a complete reference implementation, link it.** Format: "See [`theme.ts`](../packages/theme-default/src/theme.ts) for the complete reference implementation with all token keys and default values." Used in `themes.md` and `troubleshooting.md`. Writers must use this pattern instead of reproducing all token keys inline.

**Error messages are quoted verbatim in troubleshooting.** Each error entry shows the exact error string in a plain code block (no language tag), then **Cause:** and **Fix:** in bold. No "Note:", no callout boxes.

**Troubleshooting "Fix" entries are short.** They state the fix and show only the necessary code. If a fix requires a code example, it is 3–10 lines. They do not re-explain concepts already covered in the main docs — they link instead.

---

## Content Partitioning

Each page owns its topic. Writers must not write content that belongs on another page.

| Topic | Owned by |
|-------|----------|
| Comparison to alternatives | `comparison.md` |
| Design principles, three-persona model, token alignment, build-time validation, extensibility | `design-principles.md` |
| Install, first build, editor setup | `quick-start.md` |
| Frontmatter, slide separators, text formatting, lists, tables (GFM), speaker notes, directive summary table | `markdown-syntax.md` |
| Full component reference (content + layout), directive syntax, custom component authoring, DSL functions, token system, expansion function | `components.md` |
| Built-in layout reference (params + examples), custom layout authoring, slot mechanics, masters, testing layouts | `layouts.md` |
| Theme structure, color/font/spacing/border/component token configuration, variants system, font requirements, registering layouts in themes, testing themes | `themes.md` |
| CLI flags, exit codes, debug workflow | `cli.md` |
| Error messages, causes, fixes, debug tools | `troubleshooting.md` |
| Install + minimal example (3-slide) | `README.md` |

`markdown-syntax.md` contains a summary table of available directives. This controlled duplication is by design — authors should not need to visit `components.md` for a quick reference.

**Cross-reference, never duplicate.** If `layouts.md` needs to mention parameter schema helpers, it links to `components.md#defining-parameters`. It does not re-document the schema helpers. If `themes.md` needs to mention layout registration, it says "For how to package layouts with your theme entry point, see [Themes — Registering Layouts in Themes](./themes.md#registering-layouts-in-themes)" (as the current `layouts.md` does).

**The "Common Patterns" section in `components.md` is the one place for multi-component usage examples.** Individual component sections show that component in isolation. Patterns that combine multiple components (row + card, column + quote + text) belong in Common Patterns.

**Directive syntax lives in `components.md` only.** `markdown-syntax.md` mentions that directives exist and cross-references `components.md`. It does not duplicate the syntax explanation.

**GFM table syntax lives in `markdown-syntax.md` only.** `components.md` mentions that `:::table` directive body uses GFM syntax without re-explaining GFM. The `:::table` component itself (styled tables) lives in `components.md`.

---

## Anti-Patterns

**No emoji.** None appear anywhere in the existing documentation.

**No callout boxes.** No "Note:", "Warning:", "Tip:", "Important:" prefix boxes or blockquotes used as callouts. Critical information is stated directly in prose or as a bold standalone sentence.

**No lengthy "why" explanations.** The docs state what things do and how to use them. They do not explain the engineering rationale or design history. Exception: `design-principles.md` is explicitly the "why" page — but only there.

**No "In this section, we will..." preamble.** Sections open with content, not announcements about what is coming.

**No "As mentioned earlier" or "As we saw above."** Each section stands alone. Cross-references use links, not prose callbacks.

**No tables for things that are short bullet lists.** The "Good fit / Not a good fit" in `comparison.md` uses bullet lists. The "When to create" sections use bullet lists. Tables are for structured multi-column data (params, component summaries, comparisons).

**No passive voice for instructions.** "The body slot accepts..." (active) not "The body slot is used to accept..." (passive). "Add the missing field to the slide frontmatter." (active imperative) not "The missing field should be added..." (passive).

**No over-specifying the obvious.** `quick-start.md` says "Create a file called `slides.md`" and immediately gives the content. It does not say "You will need to use your preferred text editor or IDE to create a new file. Make sure to save it with the .md extension."

**No restating the component name in its description.** "Content card with an optional image, title, and description." Not "The card component is a content card that...".

**No "currently" or "at this time."** These phrases date documentation. State facts as facts.

**Do not list every possible value when the type already communicates it.** "6-character hex strings without a `#` prefix" explains the format once. It does not list 20 example colors.
