# Design Principles

The ideas behind tycoslide's design — why it works the way it does.

## Content as code

tycoslide treats presentations the same way a compiler treats source code. The markdown is what you version and review; the `.pptx` is the compiled output. Presentations are built in CI/CD pipelines, validated at compile time, and reproducible from the same input. There is no GUI assembly step — if the source is correct, the output is correct.

## Three personas

Presentation teams typically have three roles:

| Persona | Works in | Produces | Concerns |
|---------|----------|----------|----------|
| **Designer** | Design tools (Figma, Tokens Studio) | Design tokens, color palettes, typography scales | Visual identity, brand consistency |
| **Developer** | TypeScript | Theme files, layouts, custom components | Structural correctness, component contracts, layout mechanics |
| **Author** | Markdown | Slide decks | Content, narrative, choosing the right layout |

tycoslide is designed to support this separation. The theme controls the visual vocabulary, layouts use that vocabulary to define slide structures, and authors fill those structures with content. Each layer builds on the one above it — a developer works within the designer's token palette, and an author works within the layouts the developer built.

## Theme as source of truth

All visual decisions — colors, typography, spacing, component styling — live in the theme file. Components declare what tokens they need; the theme provides them. There are no hidden defaults buried in framework code. If a token is missing, the build fails immediately.

tycoslide's token model follows the W3C Design Token Community Group standard. The goal is full compatibility — bring tokens from Figma, Tokens Studio, or any DTCG-compliant source and they work as-is. The first release supports a fixed set of font weights and a flat token structure; full DTCG nesting and arbitrary weight values are planned.

## Build tool, not presentation tool

tycoslide compiles markdown into a `.pptx` file, then gets out of the way. Open the result in PowerPoint, Keynote, or Google Slides and present from there. The output is a standard file that works with whatever tool your audience already has.

## Fail fast

Invalid layouts, missing tokens, overflow errors, and malformed markdown all fail at build time with the slide number, layout name, and the exact field that is wrong. Silent fallbacks are bugs — if something is wrong, the deck does not ship.

## Open component registry

Anyone can add custom components and layouts without modifying framework source. Components integrate with the directive syntax in markdown and the TypeScript DSL, and receive styling tokens from the theme. See [Components — Creating Custom Components](./components.md#creating-custom-components) for the full API.
