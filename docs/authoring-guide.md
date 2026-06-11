# tycoslide Authoring Guide

Complete reference for writing slides in tycoslide markdown.

## Golden Rules

1. **Every file needs `theme` and `format` in the global frontmatter.** No format = build error.
2. **Every slide needs `template:` in frontmatter.** No template = build error.
3. **Never style from markdown.** The theme owns all design.
4. **Never use `---` in slide body content.** Triple dashes are slide separators.
5. **Quote YAML values with special characters.** See [YAML Reference](#yaml-reference).
6. **Always specify a language on fenced code blocks.** No language tag = build error.
7. **Never use `style`, `classDef`, `linkStyle`, or `%%{init}` in mermaid.** The theme styles diagrams automatically.
8. **Content that overflows is a content problem.** Reduce or restructure. Never weaken constraints.
9. **`$` paths reference theme-bundled assets.** Use `$icons.palette`, not `./assets/palette.png`.

### WRONG / RIGHT

```markdown
<!-- WRONG: no template -->
---
title: My Slide
---
```

```markdown
<!-- RIGHT -->
---
template: body
title: My Slide
---
```

```markdown
<!-- WRONG: inline styling -->
<span style="color:red">Important</span>
```

```markdown
<!-- RIGHT: use theme highlights -->
==**Important**==
```

---

## File Setup

Every tycoslide file starts with a global frontmatter block, then one or more slides separated by `---`.

```markdown
---
theme: "<your-theme-package>"
format: presentation
---

---
template: title
title: First Slide
---

---
template: body
title: Second Slide
---

Body content here.
```

| Block | Purpose | Required |
|-------|---------|----------|
| First `---` block | Global config: `theme` + `format` | Yes, must be first |
| Each subsequent `---` block | One slide: `template` + params | Yes, one per slide |
| Content after a slide's frontmatter | Body content fed into slots | Only for templates with slots |

---

## Adding a Slide

Every slide starts with a `---` frontmatter block containing at minimum a `template:` field. Check your theme's `manifest.json` for available templates -- each entry includes `description`, `whenToUse`, `params`, `slots`, and `limits`.

```markdown
---
template: body
title: Quarterly Results
eyebrow: FINANCE
notes: |
  Mention the 40% growth figure.
  Pause for questions.
---

Body content goes here.
```

### Param types

**Scalar params** are plain strings. Quote when the value contains `: `, `[`, `]`, `{`, `}`, `#`, or starts with `*`, `&`, `!`.

```yaml
title: My Title
title: "Revenue: Q3 Update"
```

**Array params** use `- ` prefix with 2-space indent for nested keys:

```yaml
items:
  - First item
  - Second item

cards:
  - title: Feature One
    description: What it does.
    image: $icons.description
  - title: Feature Two
    description: What it does.
```

**Multi-line params** use YAML `|` block scalar:

```yaml
notes: |
  First paragraph of speaker notes.
  Second paragraph of speaker notes.
```

**Image params** accept file paths or theme asset references:

```yaml
image: ./assets/photo.png       # Relative to working directory
image: $icons.palette            # Theme-bundled asset
```

---

## Text Content

Write body content as plain markdown after the slide frontmatter. The theme controls all typography.

```markdown
---
template: body
title: Our Approach
---

We deliver results through **focused execution** and _continuous iteration_.

## Key Principle

Every decision ties back to ==**customer outcomes**==.
```

### Formatting reference

| Syntax | Result |
|--------|--------|
| `**bold**` | **bold** |
| `_italic_` | _italic_ |
| `**_bold italic_**` | **_bold italic_** |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `++underlined++` | underlined |
| `[Link](https://...)` | clickable link |

### Headings

Use `##` and `###` inside slide body to create sub-sections within a slide.

### Highlights

Wrap text in `==` to apply the theme's highlight color. Combine with bold for maximum emphasis: `==**key phrase**==`.

```markdown
This is ==highlighted text==.
```

---

## Lists

Bullet and numbered lists with standard markdown syntax. Nested lists use 2-space indent, limited to 2 levels. All inline formatting works inside list items.

```markdown
---
template: body
title: Migration Plan
---

- Automated CI/CD pipeline
- 15-minute release cycles
- Zero-downtime deployments

1. Audit current infrastructure
2. Design target architecture
3. Execute phased migration

- Infrastructure
  - Kubernetes cluster
  - Service mesh
- Observability
  - Distributed tracing
```

---

## Tables

Pipe-table syntax creates themed tables. Column alignment uses `:` in the separator row: `:---` left, `:---:` center, `---:` right.

```markdown
---
template: body
title: Competitive Landscape
---

| Feature | Us | Competitor A | Competitor B |
|:--------|:--:|:------------:|:------------:|
| API Access | Yes | Limited | No |
| Custom Themes | Yes | No | Yes |
| Self-Hosted | Yes | Yes | No |
```

The `:::table` directive produces identical output:

```markdown
:::table
| Header | Header |
|--------|--------|
| Cell   | Cell   |
:::
```

Check template `limits` in `manifest.json` for row/column constraints.

---

## Images

Embed images from local files or theme-bundled assets. Paths starting with `$` reference theme assets -- check `manifest.json` for available categories and names.

```markdown
![System diagram](./assets/architecture.png)
![Logo]($illustrations.logo)
```

For the `:::image` directive with additional parameters, see [Components](./components.md#image).

---

## Code Blocks

Fenced code blocks render as syntax-highlighted images. The language tag is **required** (no tag = build error).

````markdown
```typescript
interface Config {
  theme: string;
  format: string;
}
```
````

**Supported languages:** `typescript`, `javascript`, `python`, `sql`, `rust`, `go`, `java`, `bash`, `json`, `html`, `css`, `yaml`, `toml`, `ruby`, `swift`, `kotlin`, `cpp`, `c`, `csharp`, `php`, `scala`, `haskell`, `lua`, `r`, `shell`, `powershell`, `dockerfile`, `graphql`, `markdown`, `xml`.

Keep code to 5-15 lines. The theme controls syntax highlighting colors.

---

## Mermaid Diagrams

Mermaid diagrams render as themed images. The theme applies all colors automatically.

```markdown
:::mermaid
flowchart LR
    A[Client] --> B[API Gateway]
    B --> C[(Database)]
    B --> D[Cache]
    class B purple
:::
```

### Supported diagram types

| Type | Keyword | Notes |
|------|---------|-------|
| Flowchart | `flowchart LR`, `flowchart TD` | Most common. Supports class names. |
| Sequence | `sequenceDiagram` | Themed through color tokens only |
| State | `stateDiagram-v2` | Themed through color tokens only |
| Entity-relationship | `erDiagram` | Themed through color tokens only |
| Gantt | `gantt` | Themed through color tokens only |

### Class names and subgraphs (flowcharts only)

Apply theme accent colors to nodes with the `class` keyword. Available names come from the theme's accent map. Subgraphs get themed fill and rounded corners automatically.

```markdown
:::mermaid
flowchart LR
    subgraph Backend ["Backend Services"]
        direction LR
        API[API] --> DB[(Database)]
    end
    Client --> Backend
    class API purple
:::
```

### Mermaid rules

| Rule | Why |
|------|-----|
| Never use `style` directives | Theme handles all styling |
| Never use `classDef` | Theme defines all classes via accents |
| Never use `linkStyle` | Theme handles edge styles |
| Never use `%%{init}` | Theme handles Mermaid config |
| Prefer `flowchart` over `graph` | Modern syntax with more features |
| Use `LR` for horizontal, `TD` for vertical | Match reading direction to content |
| Use `<br/>` for line breaks in node labels | Standard Mermaid HTML labels |
| Keep diagrams to 5-10 nodes | Slides must be readable at projection size |

---

## Multi-Column Layouts (Slots)

When you need side-by-side content, use slot markers. Templates declare named slots -- check `manifest.json` for each template's slot names.

| Slot type | Behavior | Syntax |
|-----------|----------|--------|
| Single-slot | All body content enters the slot | No marker needed |
| Multi-slot | Content splits by markers | `::slotname::` |
| No-slot | Frontmatter only; body content is an error | -- |

```markdown
---
template: transform
title: Before and After
---

::left::

### Before

- Manual deployments
- 4-hour release cycles

::right::

### After

- Automated CI/CD
- 15-minute releases
```

Content before the first `::slotname::` marker goes into the template's first declared slot.

---

## Speaker Notes

Add presenter-only notes via the `notes:` frontmatter param (YAML `|` block scalar). Notes appear in PowerPoint's presenter view. See the example in [Adding a Slide](#adding-a-slide).

---

## Common Mistakes

| Mistake | Error | Fix |
|---------|-------|-----|
| Missing `template:` | `missing 'template' field in frontmatter` | Add `template:` to every slide |
| Missing `theme:` in global frontmatter | `No theme specified` | Add global frontmatter with `theme:` |
| Body content on a no-slot template | `does not accept body content` | Move content to frontmatter params or switch templates |
| `---` inside slide body | Parsed as new slide separator | Remove -- use a different visual separator |
| Unquoted YAML with special chars | `Invalid YAML in slide frontmatter` | Quote the value: `title: "My: Title"` |
| Code block without language tag | `Code block has no language specified` | Add language: `` ```typescript `` |
| `style`/`classDef` in mermaid | Build error | Remove -- theme handles all mermaid styling |
| Unknown template name | `unknown template 'xyz'` | Check template list in `manifest.json` |
| Wrong slot name | `unknown slots: [unknown]` | Use slot names declared by the template |
| Content overflow | `Content extends beyond slide bounds` | Reduce content or split across slides |

---

## YAML Reference

| Value contains | Quote? | Example |
|---------------|--------|---------|
| Plain text | No | `title: My Title` |
| Colon + space (`: `) | Yes | `title: "Revenue: Q3"` |
| Leading `[` or `{` | Yes | `title: "[Draft] Proposal"` |
| Leading `*`, `&`, `!` | Yes | `title: "*Important* Update"` |
| Inline markdown | No (usually) | `title: My **Bold** Title` |
| `==...==` syntax | No | `body: ==**key**== insight` |
| Hash `#` | Yes | `title: "Issue #42"` |

When in doubt, quote. Quotes never hurt valid YAML but missing quotes cause parse errors.
