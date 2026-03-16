# Troubleshooting

Error messages, their causes, and how to fix them. For build flags that help with debugging (`--force`, `--preview`, `--debug`), see [Debug Tools](#debug-tools).

## Theme Errors

### "No theme specified"

```
Error: No theme specified. Add `theme: <name>` to the global frontmatter in your markdown file.
```

**Cause:** The markdown file has no global frontmatter block, or the frontmatter is missing the `theme` field.

**Fix:** Add a global frontmatter block at the very top of your file:

```markdown
---
theme: tycoslide-theme-default
---

---
layout: title
title: My Presentation
---
```

The global frontmatter must be the first thing in the file (before any slide separators).

---

### "Could not find theme package"

```
Error: Could not find theme package 'my-theme'.
Is it installed? Try: npm install my-theme
```

**Cause:** The theme name in frontmatter does not match any installed npm package.

**Fix:** Install the theme package:

```bash
npm install tycoslide-theme-default
```

If using a local theme, make sure it is listed in `package.json` dependencies and `npm install` has been run.

---

### "Theme package does not export 'theme'"

```
Error: Theme package 'my-theme' does not export 'theme'.
```

**Cause:** The theme package's entry point does not have a named `theme` export.

**Fix:** Export `theme` as a named export from your theme's `index.ts`:

```typescript
export const theme: Theme = { /* ... */ };
```

---

### "Theme package does not export 'layouts'"

```
Error: Theme package 'my-theme' does not export 'layouts'.
Layouts must be exported so importing them registers them in the layout registry.
```

**Fix:** Export `layouts` from your theme's `index.ts`:

```typescript
import { allLayouts } from './layouts.js';

export const layouts = allLayouts;
```

---

### "Missing tokens for component"

```
Component 'xyz' is missing required tokens: [foo, bar]. All tokens must be provided by the parent component or layout.
```

**Cause:** A component declares token keys that the layout's token map does not provide.

**Fix:** Add the missing token keys to the layout's token map in `theme.layouts`. See [`theme.ts`](../packages/theme-default/src/theme.ts) for the complete reference.

---

## Component Errors

### "Unknown component: 'xyz'"

```
Error: Unknown component: 'xyz'. Did you forget to register it?
```

**Fix:** Make sure the component is defined and registered before compiling:

```typescript
import { defineComponent, componentRegistry } from 'tycoslide';
const myComponent = defineComponent({ name: 'my-component', tokens: {}, render: ... });
componentRegistry.register(myComponent);
```

---

### "Unknown variant"

```
Error: Unknown variant 'highlight' for layout 'cards'. Available: default, flat
```

**Fix:** Either add the variant to your theme's layout token map, or use one of the listed available variants.

---

### "Code block has no language specified"

```
Error: Code block has no language specified. Add a language after the opening fences, e.g. ```sql
```

**Fix:**

````markdown
```typescript
const x = 1;
```
````

---

### "Unsupported code language"

```
Error: Unsupported code language "xyz". Supported languages include: typescript, python, sql, rust, go, java. See LANGUAGE constant for full list.
```

**Fix:** Use a supported language identifier. Common values: `typescript`, `javascript`, `python`, `sql`, `rust`, `go`, `java`, `bash`, `json`. See the `LANGUAGE` constant in `tycoslide-components` for the full list.

---

### "Node type already handled"

```
Error: MDAST node type 'paragraph' already handled by 'document'.
Cannot register 'my-component' for the same type.
```

**Fix:** Only one component can own each markdown node type. Remove the conflicting handler registration from the custom component.

---

## Layout Errors

### "Missing 'layout' field in frontmatter"

```
Error: Slide 3: missing 'layout' field in frontmatter
```

**Fix:**

```markdown
---
layout: body
title: My Slide
---
```

---

### "Unknown layout"

```
Error: Slide 3: unknown layout 'hero'. Available: title, section, body
```

**Fix:** Use one of the layouts listed in the error, or verify that your theme package exports the correct layouts. For the full list of available layouts, see [Layouts](./layouts.md).

---

### "Layout params validation failed"

```
Error: Layout 'title' params validation failed:
  - title: Required
```

**Fix:** Add the missing field to the slide frontmatter. Check the layout's documentation for required parameters.

---

## Missing Font Errors

### "has no bold variant" / "has no italic variant"

```
Missing font errors:

  "Fira Code" has no bold variant.
  "Fira Code" has no italic variant.
```

**Cause:** The font is missing a bold or italic variant.

**Fix:**
- Add the missing font file to your theme (ask your theme author or check the theme's documentation for how to add a bold or italic variant)
- Remove bold/italic markdown from text using that font
- Use a different font that includes bold and italic variants
- Use `--force` to compile anyway (text measurements may be inaccurate without the real font file)

---

## Overflow and Bounds Errors

Use `tycoslide build deck.md --force` to write the PPTX anyway and inspect visually, or `--preview` to write HTML files without generating a PPTX.

### "Content extends beyond slide bounds"

```
Slide 4 (layout: body, title: Key Points): Content extends beyond slide bounds:
  text at (0.50, 0.42) overflows 0.23" bottom
```

**Cause:** A measured element is taller or wider than the space the master's content bounds allow.

**Fix:**
- Reduce the amount of content on the slide
- Break the content across multiple slides
- Reduce font size in the theme's text styles
- Use `SIZE.HUG` instead of `SIZE.FILL` on containers that should shrink to fit
- Use `--force` to write the PPTX anyway and inspect which element overflows

---

### "Unintentional content overlap detected"

```
Slide 2 (layout: body, title: Overview): Unintentional content overlap detected:
  text[0] overlaps text[1] by 0.50"x0.12" in container
```

**Cause:** Two sibling elements are overlapping — typically because elements are too large for their container.

**Fix:** Use `SIZE.FILL` on children to distribute space evenly, or reduce content size. Use `--preview` to view the HTML layout and identify which elements are colliding.

---

## Markdown Parsing Errors

### "Invalid YAML in slide frontmatter"

```
Error: Invalid YAML in slide 2 frontmatter:
layout: body
title: My Slide: with a colon
```

**Fix:** Quote strings that contain special YAML characters:

```yaml
---
layout: body
title: "My Slide: with a colon"
---
```

---

## Slot and Layout Errors

### "Unknown slots"

```
Layout 'body' has unknown slots: [unknown]. Declared slots: [body].
```

**Cause:** A slide uses `::slotname::` for a slot the layout does not declare.

**Fix:** Check the layout's declared slot names in [Layouts](./layouts.md). Use only slots that appear in the layout's `slots` definition.

---

### "No-slot body content"

```
Layout 'title' does not accept body content, but body was provided. Move content into params or use a layout with slots.
```

**Cause:** Adding body content to a layout with no slots (like `title`). Layouts that accept only params cannot process markdown body content.

**Fix:** Use a layout that accepts body content (like `body`), or move the content to frontmatter params.

---

### "Horizontal rules not supported"

```
horizontal rules (---, ***, ___) are not supported in slide content. Use :::line to insert a line element.
```

**Cause:** Using `---`, `***`, or `___` inside a slide body. These characters are reserved for YAML frontmatter separators.

**Fix:** Replace horizontal rule syntax with the `:::line` directive:

```markdown
---
layout: body
title: My Slide
---

Some content

:::line

More content
```

---

### "Malformed frontmatter YAML"

```
Global frontmatter must be a YAML mapping (key: value pairs), got array.
```

**Cause:** The global frontmatter block at the top of the file is formatted as a YAML array instead of key-value pairs.

**Fix:** Use `key: value` format in frontmatter:

```markdown
---
theme: tycoslide-theme-default
author: John Doe
---

---
layout: title
title: My Presentation
---
```

---

## Debug Tools

### HTML preview

Every build writes per-slide HTML files to `{basename}-html/` for inspecting layout before opening PowerPoint. To skip PPTX generation and just get the HTML:

```bash
tycoslide build deck.md --preview
```

### Verbose logging

```bash
tycoslide build deck.md --debug
```

Prints per-slide timing, token resolution, and measurement details to the console.

### Force output despite errors

```bash
tycoslide build deck.md --force
```

Writes the PPTX even when slides have overflow, bounds, or missing font errors. Useful for visually inspecting which element overflows. Combine with `--debug` for full diagnostics.

### Theme validation

Use `defineTheme()` to catch missing or mistyped tokens at definition time. See [Themes — Theme Structure](./themes.md#theme-structure) for the full pattern.
