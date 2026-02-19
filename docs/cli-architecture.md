# CLI & Markdown Architecture Plan

Research and design notes for adding a CLI tool and Markdown input to tycoslide.

Also dir structure stuff.oh I 

## Goal

Tycoslide is currently a TypeScript library. The goal is to add a CLI that takes Markdown files as input and generates branded `.pptx` presentations — while keeping the library usable on its own.

## Unique Position

Tycoslide generates **native, editable PowerPoint** with full programmatic layout control (CSS flexbox via Playwright, component tree, theme system). No other Markdown-to-PPTX tool does this:

- **Marp** renders slides to PNG images and embeds them — output is not editable in PowerPoint
- **Pandoc** generates native PPTX but has no custom layout system — limited to what its Haskell writer supports
- **Slidev/reveal.js** are web-only, no PPTX output

## CLI Framework

The CLI surface is small: `tycoslide build deck.md --theme materialize -o deck.pptx`

### Recommendation: Commander.js (or cac)

| Option | Size | Weekly Downloads | Notes |
|--------|------|-----------------|-------|
| Commander | ~15KB | 238M | Industry standard, great docs |
| cac | ~5KB | 62M | Used by Vite/Tsup, minimal |
| citty | tiny | newer | UnJS ecosystem, TypeScript-first |

All three are adequate. Commander is the safe default; cac if we prefer minimal.

### What NOT to use

- **NestJS** — Server-side HTTP framework. Wrong architecture for file-processing CLI. Adds 50+ dependencies for a DI container we'd never use.
- **oclif** — Plugin framework. Overkill for a single-purpose tool.
- **yargs** — 290KB, heavier than needed.

### Plain TypeScript?

`node:util parseArgs` (Node 18.3+) works for zero-dependency argument parsing, but Commander gives help text, version flags, and subcommands for free with ~15KB. The overhead is negligible.

## Markdown Parser

### Recommendation: unified/remark

We need to walk an AST to map Markdown structure to the tycoslide component tree (headings, lists, tables, `---` slide breaks, `:::card` directives).

| Parser | AST? | Directives | Frontmatter | Ecosystem |
|--------|------|-----------|-------------|-----------|
| **unified/remark** | Full mdast | `remark-directive` | `remark-frontmatter` | 500+ plugins |
| markdown-it | Token stream | Plugins available | Plugin available | Proven in Marp |
| marked | No real AST | Limited | Limited | Fast but rigid |

Remark gives a proper `mdast` tree we can traverse and transform node-by-node. The plugin ecosystem handles frontmatter, GFM tables, and custom directives out of the box.

markdown-it is a valid alternative (Marp uses it), but its token-stream model is harder to map to a component tree than remark's AST.

### Plugin stack

```
remarkParse          → parse Markdown to mdast
remarkFrontmatter    → extract YAML metadata (deck title, theme, per-slide config)
remarkDirective      → custom blocks (:::card, :::columns, :::callout)
remarkGfm            → GitHub-flavored Markdown (tables, strikethrough)
```

**Current dependency status:** `remark-parse`, `remark-directive`, and `unified` are already installed. `remark-frontmatter` and `remark-gfm` need to be added.

### Slide separation

Split on `thematicBreak` nodes in mdast (represents `---` in Markdown). This is the Marp convention and is CommonMark-compliant.

## Architecture

### Pipeline

```
Markdown file
    ↓ remark-parse + remark-frontmatter + remark-directive + remark-gfm
mdast (AST)
    ↓ slide splitter (split on --- thematic breaks)
RawSlideBlock[] (mdast subtrees with frontmatter)
    ↓ document compiler (extract params, validate, call layout.render)
Presentation with slides
    ↓ writeFile()
.pptx
```

### File structure

The CLI lives inside the tycoslide repo:

```
tycoslide/
  src/
    core/           ← existing: types, registry, renderer, pptxRenderer
    dsl/            ← existing: text, image, table, card, row, column, diagram
    layout/         ← existing: pipeline, measurement, validator
    compiler/       ← new
      slotCompiler.ts    ← slot markdown → ComponentNode[] (directives + auto-wrapped bare MDAST)
      documentCompiler.ts ← slides.md → Presentation
      slideParser.ts     ← split, extract frontmatter/title/notes/slots
      assetResolver.ts   ← asset.dot.path → file path
    cli/            ← new
      cli.ts        ← Commander setup, arg parsing (~50 lines)
      config.ts     ← theme loading, frontmatter handling
```

### Where the complexity lives

The CLI shell itself is ~50 lines of Commander setup. The real work is the **document compiler** — mapping markdown to layout params:

#### Slot compiler: slot markdown → ComponentNode[]

| mdast node | tycoslide DSL call |
|-----------|-------------------|
| `heading` (depth 1) | Title extraction (consumed, not rendered) |
| `heading` (depth 2) | `text("...", { style: TEXT_STYLE.H2 })` |
| `heading` (depth 3) | `text("...", { style: TEXT_STYLE.H3 })` |
| `paragraph` | `text("paragraph content")` |
| `list` (unordered) | `text("- item1\n- item2")` (bullet runs) |
| `list` (ordered) | `text("1. item1\n2. item2")` (numbered runs) |
| `table` | `table(rows)` |
| `image` | `image(resolvedAssetPath)` |
| `thematicBreak` | slide separator |
| `containerDirective` (:::card) | `card(props)` via CardProps extraction |
| `yaml` (frontmatter) | layout params + metadata |

#### Document compiler: frontmatter → layout params

The document compiler doesn't produce `SlideNode[]`. It extracts scalar values from frontmatter and markdown content, then passes them to `layout.render()`. Layouts own all component construction.

### Theme delivery

The CLI needs a theme to render against. Options:

1. **Bundled default theme** — ship a minimal built-in theme
2. **External theme package** — `--theme materialize` resolves to `materialize_theme` package
3. **Theme file** — `--theme ./my-theme.ts` loads a local file

All three can coexist. Start with option 2 (named package) since that's how themes already work.

## Comparable tools — lessons learned

### Marp

- Multi-package: marpit (framework), marp-core (engine), marp-cli (interface)
- Uses markdown-it with custom token extensions
- PPTX output embeds PNG screenshots — **not editable**
- Lesson: clean package separation enables VS Code extension, web integration

### Pandoc

- Only tool generating native editable PPTX objects
- Uses Lua filters for content transformation
- Themes via PowerPoint reference templates (slide masters)
- Lesson: native PPTX is the right approach but needs more layout control than Pandoc offers

### Slidev

- Monorepo (pnpm workspaces), Vite + Vue 3
- Markdown as Vue component templates
- No PPTX output
- Lesson: hot reload dev server is valuable for iteration

## Implementation priority

1. **Slot compiler**: slot markdown → ComponentNode[] (foundation for everything)
2. **Document compiler**: slides.md → Presentation (the core logic)
3. **CLI entry point**: Commander with `build` command (~50 lines)
4. **Theme loading**: resolve named theme packages
5. **Zod schemas**: runtime validation with helpful error messages
6. **Custom directives**: :::card, :::callout
7. **Dev server** (future): file watcher + rebuild on change
