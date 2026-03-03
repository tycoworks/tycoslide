# Troubleshooting

Common errors and how to fix them.

## Theme Errors

### "No theme specified"

```
Error: No theme specified. Add `theme: <name>` to the global frontmatter in your markdown file.
```

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

**Fix:** Ensure your theme package exports `theme` as a named export:

```typescript
export const theme: Theme = { /* ... */ };
```

---

### "Theme package does not export 'layouts'"

```
Error: Theme package 'my-theme' does not export 'layouts'.
Layouts must be exported so that importing them registers them in the layout registry.
```

**Fix:** Add the required exports to your theme's `index.ts`:

```typescript
import { cardComponent, textComponent, /* ... */ } from 'tycoslide-components';
import { allLayouts } from './layouts.js';

export const components = [cardComponent, textComponent, /* ... */];
export const layouts = allLayouts;
export { theme } from './theme.js';
```

---

### "Theme missing tokens for component"

```
Error: Theme missing tokens for component 'card'. Required: [padding, cornerRadius, ...]
```

**Fix:** Add the missing component token block to your theme:

```typescript
components: {
  card: {
    variants: {
      default: {
        padding: 0.25,
        cornerRadius: 0.05,
        backgroundColor: 'E7E0EC',
        // ... all required tokens
      }
    }
  }
}
```

See [`theme.ts`](../packages/theme-default/src/theme.ts) for the complete token reference.

Call `componentRegistry.validateTheme(theme)` at startup to catch all missing tokens at once.

---

### "Theme missing 'default' variant for component"

```
Error: Theme missing 'default' variant for component 'card'.
```

**Fix:** Add a `default` variant to the component's `variants` map.

---

### "Component variant missing required tokens"

```
Error: Component 'card' variant 'subtle' is missing required tokens: [titleColor, descriptionColor].
Each variant must be a complete token set.
```

**Fix:** Copy the `default` variant and override only what you need:

```typescript
subtle: {
  ...defaultTheme.components.card.variants.default,
  backgroundColor: 'F0F0F0',
  backgroundOpacity: 50,
},
```

---

### "Component requires theme tokens but none were provided"

```
Error: Component 'card' requires theme tokens but none were provided.
Add them to theme.components.card. Required: [padding, cornerRadius, ...]
```

The component was registered with a `tokens` list but the theme has no `components.card` entry. This is similar to the "Theme missing tokens" error but caught at render time rather than at validation time.

**Fix:** Same as "Theme missing tokens" above — add the required block to `theme.components`.

---

## Component Errors

### "Unknown component: 'xyz'"

```
Error: Unknown component: 'xyz'. Did you forget to register it?
```

**Fix:** Make sure the component is defined and registered before compiling:

```typescript
import { defineComponent, componentRegistry } from 'tycoslide';
const myComponent = defineComponent({ name: 'my-component', tokens: [], expand: ... });
componentRegistry.register(myComponent);
```

---

### "Unknown variant for component"

```
Error: Unknown variant 'highlight' for component 'card'. Available: default, flat
```

**Fix:** Either add the variant to your theme, or use one of the listed available variants.

---

### "Code block has no language specified"

```
Error: [tycoslide] Code block has no language specified. Add a language after the opening fences, e.g. ```sql
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
Error: [tycoslide] Unsupported code language "xyz". Supported languages include: typescript, python, sql, rust, go, java. See LANGUAGE constant for full list.
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

## Overflow and Bounds Errors

These errors appear after layout measurement. Use `tycoslide build deck.md --force` to write the PPTX anyway and inspect visually, or `--preview` to write HTML files without generating a PPTX.

### "Content extends beyond slide bounds"

```
Slide 4 (layout: body, title: Key Points): Content extends beyond slide bounds:
  text at (0.50, 0.42) overflows 0.23" bottom
```

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

**Fix:** Two sibling elements are overlapping — typically because elements are too large for their container. Use `SIZE.FILL` on children to distribute space evenly, or reduce content size. Use `--preview` to view the HTML layout and identify which elements are colliding.

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

## Debug Tools

### HTML preview

Every build writes per-slide HTML files to `{basename}-html/`. To skip PPTX generation and just get the HTML:

```bash
tycoslide build deck.md --preview
```

### Verbose logging

```bash
tycoslide build deck.md --debug
```

Prints detailed build logging to the console.

### Force output despite errors

```bash
tycoslide build deck.md --force
```

Writes the PPTX even when slides have layout validation errors. Combine with `--preview` or `--debug` to diagnose the issues.

### Theme validation

Validate your theme's tokens against all registered components before building:

```typescript
import { componentRegistry } from 'tycoslide';
import { theme } from './my-theme';

componentRegistry.validateTheme(theme); // throws on first missing token
```
