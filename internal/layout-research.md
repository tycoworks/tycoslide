# Slide Layout Research

Research into common slide layouts from Slidev, Marp, and Reveal.js to inform tycoslide's layout expansion.

---

## Slidev Layouts

Slidev provides 18 built-in layouts out-of-the-box. This is the most comprehensive set among the three tools.

### Basic Layouts

- **center**: Displays content in the middle of the screen (vertically and horizontally centered)
- **default**: The fundamental layout for displaying any slide content
- **full**: Uses all available screen space to display content (no padding/margins)
- **none**: Layout without any styling, offering complete customization freedom

### Presentation Structure Layouts

- **cover**: Cover page for the presentation with title, contextualization, etc.
- **intro**: Introduction slide with presentation title, short description, author, etc.
- **section**: Marks the beginning of a new presentation section (like a chapter divider)
- **end**: The closing slide layout for presentations

### Content Emphasis Layouts

- **fact**: Shows data or facts with prominence on the screen (typically large, centered text)
- **quote**: Displays a quotation with prominence (special styling for quotes)
- **statement**: Makes an affirmation/statement as the main page content (bold, impactful)

### Multi-Column Layouts

- **two-cols**: Divides slide into left and right sections
  - Uses `::right::` delimiter to separate content
  - 50/50 split by default

- **two-cols-header**: Full-width header with two columns below
  - Uses `::left::` and `::right::` delimiters
  - Useful for categorized content under a common title

### Image Layouts

- **image**: Shows an image as the main content
  - Parameter: `backgroundSize` (default: `cover`)

- **image-left**: Image on left (50%), content on right (50%)
  - Parameters: `image` (path), `class` (custom styling)

- **image-right**: Image on right (50%), content on left (50%)
  - Parameters: `image` (path), `class` (custom styling)

### Iframe Layouts

- **iframe**: Shows a web page as main content
- **iframe-left**: Web content on left, text content on right
- **iframe-right**: Web content on right, text content on left

### Key Insights from Slidev

1. Clear separation between structural slides (cover, intro, section, end) and content slides
2. Dedicated layouts for emphasis (fact, quote, statement)
3. Image layouts always use 50/50 split (some users request configurable widths)
4. All layouts support optional `class` parameter for custom styling
5. Themes can extend or override these layouts

**Sources:**
- [Slidev Built-in Layouts](https://sli.dev/builtin/layouts)
- [Slidev Layout Guide](https://sli.dev/guide/layout)
- [Slidev Theme Neversink Layouts](https://gureckis.github.io/slidev-theme-neversink/layouts.html)

---

## Marp Layouts

Marp takes a different approach: instead of many built-in layouts, it provides **3 themes** with **class directives** to modify layout behavior.

### Built-in Themes

1. **default**: GitHub markdown style, vertically centered content
2. **gaia**: Left-top aligned by default, can use `lead` class for centering
3. **uncover**: Simple, minimal, modern (inspired by Reveal.js)

### Layout Classes

Marp uses the `class` directive to change layouts:

- **lead**: Centered leading header with large text (hero-style)
- **invert**: Inverted color scheme (white on dark instead of dark on white)

Classes can be combined:
```markdown
---
class:
  - lead
  - invert
---
```

### Class Directive Operators

Marp supports `+` and `-` prefixes to add/remove classes:
- `<!-- _class: +lead -->` - adds lead class
- `<!-- _class: -invert -->` - removes invert class

### Column Layouts

Marp doesn't provide built-in column layouts but recommends using **HTML + CSS**:
- Users create custom `.columns` classes with CSS Grid
- Background images support split sizing: `![bg left:33%](image.jpg)`

### Key Insights from Marp

1. Philosophy: Prefer web standards (HTML/CSS) over framework-specific syntax
2. Minimal built-in layouts, maximum flexibility through CSS
3. Class-based approach allows combining layout modifiers
4. Split backgrounds for image layouts (but only for backgrounds, not content)
5. Community themes extend with additional layouts

**Sources:**
- [Marp Core Themes](https://github.com/marp-team/marp-core/blob/main/themes/README.md)
- [Marpit Directives](https://marpit.marp.app/directives)
- [Customizing Marp](https://chris-ayers.com/2023/03/31/customizing-marp/)

---

## Reveal.js Layout Patterns

Reveal.js provides **layout helper classes** rather than predefined layouts. Users combine these helpers with custom CSS to create layouts.

### Built-in Layout Helpers

- **r-fit-text**: Makes text as large as possible without overflowing
  - Great for big statement slides

- **r-stretch**: Resizes element to cover remaining vertical space
  - Useful for making images/videos fill available space

- **r-stack**: Centers and stacks multiple elements on top of each other
  - Intended for use with fragments (incremental reveals)
  - Example: Overlaying multiple images that appear one by one

- **r-frame**: Decorates elements to make them stand out
  - Adds hover effect when inside anchor tag

### Common Custom Layout Patterns

Reveal.js users typically create custom layouts with CSS:

- **Two-column grid**: `.l-double { display: grid; grid-template-columns: 1fr 1fr; }`
- **Custom column ratios**: `grid-template-columns: 70% 30%`
- **Multi-column grids**: Flexible layouts with CSS Grid

### Fragments System

Reveal.js has a sophisticated fragments system for incremental reveals:
- Elements with `class="fragment"` appear step-by-step
- Fragment types: `fade-in`, `fade-out`, `fade-up`, `current-visible`
- `data-fragment-index` controls order

### Key Insights from Reveal.js

1. Helper-based approach: composable utilities instead of fixed layouts
2. Strong emphasis on progressive disclosure (fragments, stacks)
3. CSS Grid is the primary layout mechanism
4. More flexibility but requires more CSS knowledge
5. Quarto extends Reveal.js with markdown syntax for columns

**Sources:**
- [Reveal.js Layout Documentation](https://revealjs.com/layout/)
- [Reveal.js Layout Helpers Examples](https://www.gerardoroadabike.com/presentations/30months/examples/layout-helpers.html)
- [Quarto Reveal.js](https://quarto.org/docs/presentations/revealjs/)
- [Customizing Reveal.js](https://chenhuijing.com/blog/customising-revealjs-beyond-theming/)

---

## General Presentation Layout Best Practices

Based on research into presentation design best practices:

### Common Slide Layout Patterns

1. **Title/Cover**: Large title, subtitle, author info
2. **Section Divider**: Chapter/section markers
3. **Two-Column**: Side-by-side content (text + text or text + image)
4. **Comparison**: Side-by-side comparison (pros/cons, before/after)
5. **Hero/Statement**: Large impactful text, minimal other content
6. **Quote/Testimonial**: Emphasized quotation with attribution
7. **Full Image**: Image as background with optional text overlay
8. **Center**: Simple centered content without title
9. **Default/Body**: Standard content with optional title

### Layout Variety Guidelines

- Use 3-7 different layouts for variety without confusion
- Too many layouts makes presentation feel disjointed
- Consistent layouts help maintain visual flow
- Different layouts should serve different content types

### Comparison Slide Best Practices

- Structured columns for side-by-side comparison
- 3-5 points per column (more reduces clarity)
- Clear headings for each side
- Optional icons/visuals to enhance interpretation
- Balanced content on both sides

**Sources:**
- [Slide Layout Best Practices](https://www.lenovo.com/us/en/glossary/slide-layout/)
- [PowerPoint Comparison Slides](https://www.slidesai.io/blog/powerpoint-comparison-slide)
- [Pros and Cons Slides](https://slidemodel.com/pros-and-cons-slide/)

---

## Recommendations for tycoslide

Based on the competitive analysis, here are the recommended layouts to add to tycoslide:

### Priority 1: Essential Layouts (Add These First)

1. **two-column** (currently missing)
   - 50/50 split by default
   - Parameters: `leftWidth` (default: 50%), `align` (top/center)
   - Use cases: Side-by-side content, text + image, text + text
   - Most requested layout across all tools

2. **image-background** (enhancement of current patterns)
   - Image as background with text overlay
   - Parameters: `image`, `opacity` (for dimming), `backgroundSize`
   - Use cases: Hero slides, visual impact

3. **center** (currently missing)
   - Just centered content, no title area
   - Use cases: Simple statements, quotes, single images

4. **quote** (currently missing)
   - Large quotation text with attribution
   - Parameters: `author`, `cite` (source)
   - Use cases: Testimonials, emphasis on specific statements

5. **comparison** (currently missing)
   - Side-by-side with visual comparison styling
   - Parameters: `leftTitle`, `rightTitle`, `leftIcon`, `rightIcon`
   - Use cases: Pros/cons, before/after, option A vs B

### Priority 2: Nice-to-Have Layouts

6. **statement** (enhancement of existing)
   - Extra-large text, minimal layout (similar to Slidev's fact/statement)
   - Parameters: `emphasis` (size multiplier)
   - Use cases: Key takeaways, impactful one-liners

7. **image-split** (new variation)
   - Configurable split ratio (not just 50/50)
   - Parameters: `image`, `imageWidth` (default: 50%), `imagePosition` (left/right)
   - Use cases: Flexible image + content layouts

### Keep Current Layouts

- **title**: Cover/intro slide (essential)
- **section**: Section dividers (essential)
- **body**: Default content layout (essential)

### Layout Architecture Recommendations

1. **Composable System**: Like Reveal.js, provide utility classes
   - `.centered`, `.full-width`, `.split-50-50`, etc.
   - Allows users to combine modifiers

2. **Parameter Flexibility**: Learn from Slidev
   - Optional parameters with sensible defaults
   - `class` parameter for custom styling override

3. **Progressive Enhancement**: Start simple
   - Basic layouts first (two-column, center, quote)
   - Advanced features later (fragments, animations, stacks)

4. **Theme Integration**: Follow Marp's philosophy
   - Layouts should respect theme colors/fonts
   - Allow themes to override layout styles

### Implementation Priority

**Phase 1** (Core expansion):
- two-column
- center
- image-background

**Phase 2** (Content emphasis):
- quote
- comparison
- statement

**Phase 3** (Advanced):
- image-split with configurable ratios
- Utility class system
- Fragment/progressive disclosure system

This would bring tycoslide from 3 layouts to 9-10 layouts, matching the essential coverage of professional presentation tools while maintaining simplicity.
