# tycoslide

Create editable PowerPoint slides from markdown, using your existing .pptx templates.

## Getting started

1. **Create a tycoslide theme.** Install the [create-theme](skills/create-theme) skill (`npx skills add tycoworks/tycoslide`) and give an agent such as Claude Code or Codex your `.pptx`. You'll get back an npm package of mapped layouts, colors, and visual assets, like the [tycoworks-theme](https://github.com/tycoworks/tycoworks-theme).
2. **Write slides in markdown.** GitHub-flavored markdown is supported; see [Markdown support](#markdown-support) below. tycoslide themes also include an agent skill, so an agent can write the slides for you.
3. **Build.** `npx tycoslide build deck.md` compiles the markdown into an editable PowerPoint file.

## See it working

[how-it-works.md](https://github.com/tycoworks/tycoworks-theme/blob/main/how-it-works.md) is a deck about tycoslide, written against the [tycoworks-theme](https://github.com/tycoworks/tycoworks-theme). Clone the theme and build it:

```bash
git clone https://github.com/tycoworks/tycoworks-theme && cd tycoworks-theme
npm install
npx tycoslide build how-it-works.md
```

https://github.com/user-attachments/assets/f31c11d8-3fe6-464f-8f02-56645b4ce3a6

## Markdown support

- Paragraphs, bullets and numbered lists, with bold, italic and links
- Tables, images and speaker notes
- Code, with [Shiki](https://shiki.style) syntax highlighting
- [Mermaid](https://mermaid.js.org) diagrams

Full syntax in [markdown.md](docs/markdown.md).

## Requirements

Node 23.6 or later. Mermaid diagrams need Chrome on the machine; tycoslide finds an installed one, or run `npx playwright install chromium-headless-shell`.

## Thanks

tycoslide was inspired by [pptx-automizer](https://github.com/singerla/pptx-automizer), which it uses under the hood, and by [Slidev](https://sli.dev) and its markdown slides.
