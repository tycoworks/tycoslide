# Presentation-from-Code Tools

Survey of markdown and code-based presentation tools. Last updated: March 2026.

---

## Landscape

tycoslide generates **.pptx files with native PowerPoint objects** — editable text, shapes, and tables. Other tools in this space produce HTML for browser-based presenting, or export .pptx as screenshot images.

---

## Tools That Can Export .pptx

### Slidev

- **Output formats:** HTML, PDF, .pptx (image-based)
- **pptx type:** Image-based — each slide is a screenshot. Text is not selectable or editable.
- **Input:** Markdown + Vue components
- **Theming:** npm packages containing Vue SFCs + CSS. Fonts loaded from Google Fonts CDN (not bundled).
- **Components:** Vue components with full Vue reactivity
- **Layout system:** Full CSS/HTML
- **Validation:** None at build time
- **Maintained:** Yes, actively
- **Links:** [sli.dev](https://sli.dev), [Export docs](https://sli.dev/guide/exporting)

### Marp

- **Output formats:** PDF, HTML, .pptx (image-based)
- **pptx type:** Image-based — each slide rendered as an image. Text and shapes not editable.
- **Input:** Markdown
- **Theming:** Single CSS file per theme. No components, no layouts beyond what CSS provides.
- **Components:** None — Markdown-It plugins only
- **Layout system:** Full CSS
- **Validation:** None at build time
- **Maintained:** Yes, actively
- **Links:** [marp.app](https://marp.app)

---

## Tools That Produce HTML/PDF Only

### Reveal.js

- **Output formats:** HTML, PDF (via `?print-pdf` in browser)
- **pptx:** No built-in export. Workarounds via DeckTape → PDF → manual conversion.
- **Input:** Markdown + HTML
- **Theming:** Compiled CSS from Sass source files
- **Components:** Plugin ecosystem
- **Layout system:** Full CSS/HTML
- **Maintained:** Yes, actively
- **Links:** [revealjs.com](https://revealjs.com), [PDF export](https://revealjs.com/pdf-export/)

### Shower

- **Output formats:** HTML, PDF (well-supported print CSS)
- **pptx:** No
- **Input:** HTML
- **Theming:** Formal theme separation from engine. Ships Ribbon and Material themes. Plugin system.
- **Maintained:** Yes, actively (v3.3.1, October 2024)
- **Links:** [shwr.me](https://shwr.me), [GitHub](https://github.com/shower/shower)

### remark

- **Output formats:** HTML, PDF (via DeckTape or browser print)
- **pptx:** No
- **Input:** Markdown
- **Theming:** CSS-based. Markdown class annotations for per-slide styling.
- **Components:** None
- **Maintained:** Stagnant (last release v0.15.0, January 2020)
- **Links:** [remarkjs.com](https://remarkjs.com), [GitHub](https://github.com/gnab/remark)

### impress.js

- **Output formats:** HTML, PDF (via DeckTape)
- **pptx:** No. A GitHub issue requested PPT import; proposed workaround was image conversion.
- **Input:** HTML
- **Theming:** Plugin architecture, CSS-based styling
- **Maintained:** Low activity (v2.0.0, July 2022)
- **Links:** [impress.js.org](https://impress.js.org), [GitHub](https://github.com/impress/impress.js)

### Inspire.js

- **Output formats:** HTML only
- **pptx:** No
- **Input:** HTML
- **Theming:** CSS theming. Plugin hooks.
- **Maintained:** Low activity (v1.1.0, December 2021). Maintained by Lea Verou for her own talks.
- **Links:** [inspirejs.org](https://inspirejs.org), [GitHub](https://github.com/LeaVerou/inspire.js)

### WebSlides

- **Output formats:** HTML only
- **pptx:** No
- **Input:** HTML
- **Theming:** 40+ CSS component classes (cards, quotes, covers, backgrounds)
- **Maintained:** Abandoned (last release v1.5.0, September 2017)
- **Links:** [GitHub](https://github.com/webslides/WebSlides)

### Bespoke.js

- **Output formats:** HTML only
- **pptx:** No
- **Input:** HTML/JS
- **Theming:** Plugin-based (npm). No built-in component system.
- **Maintained:** Abandoned (~2015)
- **Links:** [GitHub](https://github.com/bespokejs/bespoke)

### deck.js

- **Output formats:** HTML, PDF (browser print)
- **pptx:** No
- **Input:** HTML
- **Theming:** CSS themes, jQuery plugin extensions
- **Maintained:** Abandoned (~2014)
- **Links:** [GitHub](https://github.com/imakewebthings/deck.js)

### Flowtime.js

- **Output formats:** HTML only
- **pptx:** No
- **Input:** HTML
- **Theming:** CSS-based. Unique 2D grid navigation.
- **Maintained:** Abandoned (~2020)
- **Links:** [GitHub](https://github.com/marcolago/flowtime.js)

### DZSlides

- **Output formats:** HTML (single self-contained file), PDF (browser print)
- **pptx:** No
- **Input:** HTML
- **Theming:** Minimal single-file CSS
- **Maintained:** Abandoned
- **Links:** [GitHub](https://github.com/paulrouget/dzslides)

### NueDeck

- **Output formats:** HTML, PDF (via DeckTape)
- **pptx:** No
- **Input:** Extended markdown
- **Theming:** Extended markdown syntax for layout
- **Maintained:** Archived (March 2022). Maintainer switched to Slidev.
- **Links:** [GitHub](https://github.com/twitwi/nuedeck)

### Slidy (W3C)

- **Output formats:** HTML, PDF (browser print)
- **pptx:** No
- **Input:** HTML
- **Theming:** CSS-based
- **Maintained:** Legacy/reference tool from W3C. No active development since ~2010.
- **Links:** [W3C](https://www.w3.org/Talks/Tools/Slidy2/)

### RISE

- **Output formats:** HTML (live reveal.js inside Jupyter). PDF via nbconvert.
- **pptx:** No
- **Input:** Jupyter notebooks
- **Theming:** Inherits reveal.js themes
- **Maintained:** Effectively deprecated. Incompatible with JupyterLab.
- **Links:** [GitHub](https://github.com/damianavila/RISE)

---

## Summary Table

| Tool | .pptx? | pptx Type | Active? |
|------|--------|-----------|---------|
| **tycoslide** | **Yes** | **Native objects** | **Yes** |
| Slidev | Yes | Image-based | Yes |
| Marp | Yes | Image-based | Yes |
| Reveal.js | No | — | Yes |
| Shower | No | — | Yes |
| remark | No | — | Stagnant |
| impress.js | No | — | Low |
| Inspire.js | No | — | Low |
| WebSlides | No | — | Abandoned |
| Bespoke.js | No | — | Abandoned |
| deck.js | No | — | Abandoned |
| Flowtime.js | No | — | Abandoned |
| DZSlides | No | — | Abandoned |
| NueDeck | No | — | Archived |
| Slidy | No | — | Legacy |
| RISE | No | — | Deprecated |
