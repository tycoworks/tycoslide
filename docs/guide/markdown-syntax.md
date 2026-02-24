# Markdown Syntax

Learn the essential Markdown syntax for authoring tycoslide presentations.

## Slide Structure

Every slide has two parts:

1. **Frontmatter** (YAML configuration)
2. **Body** (Markdown content)

Slides are separated by `---` (three hyphens on their own line).

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

This sets the theme for all slides.

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

## Text Formatting

### Bold and Italic

```markdown
**Bold text**
_Italic text_
**_Bold and italic_**
```

### Inline Accents

Use named accents to highlight text:

```markdown
This is :blue[highlighted in blue].
This is :green[styled as a metric].
This is :red[styled as a warning].
```

Available accents depend on your theme's color scheme.

### Headings

Use headings for structure within slide body:

```markdown
## Main Point

### Supporting Detail

Regular paragraph text.
```

Headings are styled according to your theme's text styles.

### Paragraphs

Separate paragraphs with blank lines:

```markdown
First paragraph.

Second paragraph.
```

## Lists

### Bullet Lists

```markdown
- First item
- Second item
- Third item
```

Or use asterisks:

```markdown
* First item
* Second item
* Third item
```

### Numbered Lists

```markdown
1. First step
2. Second step
3. Third step
```

Numbers auto-increment, so you can use `1.` for all items:

```markdown
1. First step
1. Second step
1. Third step
```

### Nested Lists

Indent with 2 spaces:

```markdown
- Top level
  - Nested item
  - Another nested item
- Back to top level
```

## Tables

Use GitHub Flavored Markdown (GFM) table syntax:

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

Alignment is supported:

```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| L    | C      | R     |
```

For styled tables, use the `:::table` directive (see [Components](./components.md)).

## Speaker Notes

Add speaker notes in frontmatter:

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

Use `|` for multi-line notes. For single-line notes:

```markdown
notes: This is a brief note.
```

Notes appear in PowerPoint's presenter view.

## Slide Separators

Use `---` on its own line to separate slides:

```markdown
---
layout: body
title: First Slide
---

Content.

---
layout: body
title: Second Slide
---

More content.
```

The separator must:
- Be on its own line
- Have exactly three hyphens
- Have no spaces before or after

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

You can use **bold**, _italic_, and **_bold italic_** text.

Highlight with :blue[accent colors] from your theme.

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

For component directives and parameters, see [Components](./components.md).

## Related

- [Quick Start](./quick-start.md) - Your first presentation
- [Components](./components.md) - Directives for rich content
- [Layouts](../default-theme/layouts.md) - Available slide layouts
- [CLI](./cli.md) - Build command options
