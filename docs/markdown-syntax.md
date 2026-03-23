# Markdown Syntax

tycoslide uses GitHub Flavored Markdown for slide content, with extensions for directives and inline accents.

## Slide Structure

Slides are separated by `---` on its own line. Each slide has a YAML frontmatter block followed by optional body content.

```markdown
---
layout: body
title: Slide Title
eyebrow: SECTION NAME
---

Body content goes here.

---
layout: body
title: Next Slide
---

More content.
```

## Global Frontmatter

The first frontmatter block configures the entire presentation:

```markdown
---
theme: tycoslide-theme-default
---
```

## Per-Slide Frontmatter

Each slide must specify a layout and any layout-specific parameters:

```markdown
---
layout: body
title: My Slide Title
eyebrow: CHAPTER 1
---
```

Common parameters:
- `layout` - Which layout to use (required)
- `title` - Slide title
- `eyebrow` - Small label above title
- `subtitle` - Subtitle text (title layout only)
- `notes` - Speaker notes

Values are plain YAML — quote only when the value contains special characters like `[`, `]`, or `: ` mid-string. Plain text values do not need quotes.

## Text Formatting

```markdown
**Bold text**
_Italic text_
**_Bold and italic_**
~~Strikethrough text~~
++Underlined text++
[Link text](https://example.com)
```

### Inline Accents

Use named accents to highlight text:

```markdown
This is :blue[highlighted in blue].
This is :green[styled as a metric].
This is :red[styled as a warning].
```

Accent names are defined by your theme as an open set — any key in the theme's `accents` map is valid. Common names like `blue`, `green`, and `red` are provided by `tycoslide-theme-default`.

### Headings

```markdown
## Main Point

### Supporting Detail
```

## Lists

Bullet and numbered lists with inline text formatting.

```markdown
- First item
- Second item
- Third item
```

```markdown
1. First step
2. Second step
3. Third step
```

Nested lists use 2-space indent:

```markdown
- Top level
  - Nested item
  - Another nested item
- Back to top level
```

## Tables

Markdown tables with inline text formatting.

```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| L    | C      | R     |
```

The `:::table` directive is also available. See [Components — table](./components.md#table).

## Speaker Notes

```markdown
---
layout: body
title: Important Slide
notes: |
  Remember to emphasize the key point.
  Transition to next section after questions.
---

Slide content here.
```

Notes appear in PowerPoint's presenter view.

## Code Blocks

Syntax-highlighted code rendered as an image. The language tag after the opening fences is required.

````markdown
```sql
SELECT * FROM orders WHERE status = 'active';
```
````

See [Components — code](./components.md#code) for supported languages and theme tokens.

## Images

Embed images from local files or theme-bundled assets.

```markdown
![Alt text](./assets/photo.png)
![Logo]($illustrations.logo)
```

Paths starting with `$` reference theme-bundled assets. For the `:::image` directive and parameters, see [Components — image](./components.md#image).

## Directives

Components that do not have markdown shorthand use the `:::` directive syntax:

```markdown
:::name{param="value"}
Body content.
:::
```

For a complete reference of all directives, parameters, and examples, see [Components](./components.md#content-components).

## Complete Example

```markdown
---
theme: tycoslide-theme-default
---

---
layout: title
title: Markdown Basics
subtitle: Essential Syntax for tycoslide
---

---
layout: body
title: Text Formatting
eyebrow: BASICS
notes: Demo each formatting style
---

You can use **bold**, _italic_, **_bold italic_**, ~~strikethrough~~, and ++underlined++ text.

Highlight with :blue[accent colors] from your theme.

Add [clickable links](https://example.com) to any slide.

---
layout: body
title: Lists and Structure
---

## Key Points

- Write in plain Markdown
- Frontmatter for configuration
- Body for content

## Process

1. Write content
1. Build with CLI
1. Open in PowerPoint

---
layout: section
title: Next Steps
---
```

## Related

- [Quick Start](./quick-start.md) - Your first presentation
- [Components](./components.md) - Content and layout reference
- [Layouts](./layouts.md) - Available slide layouts
- [CLI](./cli.md) - Build command options
