---
name: create-theme
description: Turn a branded PowerPoint template into a tycoslide theme, packaged as an Agent Skill that builds editable decks from markdown. Use when someone hands over a .pptx and wants repeatable decks from it, or says "make a theme", "create a theme", "tycoslide theme", or "turn this template into a theme".
compatibility: Needs Node 23.6+, LibreOffice (soffice), poppler (pdftoppm) and python3. Chrome only if decks will contain mermaid diagrams.
---

# Create a theme

## What you are making

tycoslide builds a deck by filling the shapes of a real PowerPoint template with content, then writes a new PowerPoint file that anyone can edit. To do that it needs a theme: a directory holding the template, a `theme.json` that maps the template's slides and shapes, and any pictures decks may use. Packaged, the theme is an Agent Skill. Once it is installed, "write me a board deck" in a chat produces an editable `.pptx`.

```
my-theme/
  template/brand.pptx    the designer's file, never modified
  theme.json             the map onto it, and the only file you author
  assets/                pictures decks may use
  package.json           depends on @tycoworks/tycoslide
```

[tycoworks-theme](https://github.com/tycoworks/tycoworks-theme) is a finished one. Its `theme.json` is a worked example of every feature below, and its `showcase.md` is a deck that exercises every layout.

## The three steps

1. **Map.** Read the template, render every slide, and draft `theme.json`. You do this alone. Nothing is decided yet: every layout, name and field is a proposal.
2. **Decide.** Build one test slide per layout, render it, fix what is wrong, and repeat until every layout renders cleanly. Nothing is asked of the user.
3. **Pack.** Check the pictures, declare fonts and diagram colors, and run one command that turns the directory into an installable skill.

## Ground rules

- **Never edit the template.** Everything tycoslide needs lives in `theme.json`. If a mapping problem seems to need a change to the `.pptx`, the fix is in the map.
- **Infer everything; never ask.** The template already holds the answers: slide names, which slides are duplicates, which are dark, what the fonts and colors are, which images are the brand's. The defaults are one layout per distinct slide, only headlines required, and only the template's own images. Whatever the user wants different, they change afterwards, and the hand-off tells them how.
- **The render is the test.** A mapping is right when the rendered PNG looks right. Assume the first build fails.
- **Names are permanent.** Layout names and field keys are what every future deck author types. Treat them like an API.

## Before starting

Check the tools once:

```bash
node --version        # 23.6 or later
soffice --version     # LibreOffice, renders a .pptx to PDF
pdftoppm -v           # poppler, turns the PDF into PNGs
python3 --version
```

Install what is missing before going on. macOS: `brew install --cask libreoffice && brew install poppler`. Debian or Ubuntu: `apt-get install libreoffice-impress poppler-utils`.

## 1. Map

**Goal:** a complete draft. Every slide rendered and inventoried, `theme.json` written, nothing decided.

### 1.1 Scaffold

Clone the reference theme and swap in the template. You inherit a working `package.json`, `.gitignore`, and the font, code and diagram settings, and only the layouts and assets start empty. `brand.pptx` stands for the template's real file name, here and in every command below.

```bash
git clone https://github.com/tycoworks/tycoworks-theme my-theme && cd my-theme
rm -rf .git assets README.md showcase.md template/*.pptx && mkdir -p assets template
cp ~/wherever/brand.pptx template/
echo render/ >> .gitignore
python3 - <<'PY'
import json
t = json.load(open('theme.json'))
t['template'], t['layouts'], t['assets'] = 'brand.pptx', [], {}
json.dump(t, open('theme.json', 'w'), indent=2)
PY
```

In `package.json`, set `name` to the theme's name, which becomes the skill's name, and `description`. Then run `npm install`. It also writes `syntax.md`, the markdown reference you will write the test deck against.

### 1.2 Render the template

Render the template itself, once, so every later decision can be made by looking at a picture.

```bash
mkdir -p render && soffice --headless --convert-to pdf --outdir render template/brand.pptx
pdftoppm -png -r 60 render/brand.pdf render/slide
```

`render/slide-01.png` is the first slide in **presentation order**. `theme.json` refers to slides by the number in their **file name**, `ppt/slides/slideN.xml`, and the two orders can differ. The inventory prints both, so use it to pair each picture with its file number.

### 1.3 Inventory

```bash
python3 scripts/inventory.py template/brand.pptx
npx tycoslide extract-media template/brand.pptx assets/brand
```

The first prints the slide size, the color scheme and the fonts, then every slide by file number: its position, its layout name, whether its background is light, dark or a picture, and each shape with its kind, position, size, table rows and placeholder text. It ends with the slides that share identical geometry. Sizes print in inches so they read at a glance; `theme.json` wants EMU, so run it again with `--json` when you copy a `frame`, and never convert by hand. Text shows paragraph breaks as ¶ and line breaks as ↵, which is where `\n` goes in a parameter template.

The second copies every image the masters and layouts reference, the logos, marks and backdrops, into `assets/brand`. Pictures placed on individual slides are sample content and stay out, unless the PNG shows one is a brand mark. If the user has a folder of brand assets outside the template, such as logos, icons or product shots, copy it under `assets/` with one subfolder per category and treat it the same way from here on.

Shape names mean nothing. They are whatever the designer's tool produced, `Google Shape;877;p95` is normal, and they are never renamed, only referenced. What matters is the placeholder text, because it says what the shape is for.

### 1.4 Draft `theme.json`

One layout per slide worth keeping. Drop, for now: geometry duplicates, keeping the first; slides with no fillable shapes; and reference slides such as color palettes, logo sheets and font specimens. Record what you dropped and why, so the user can bring one back. The list is often empty.

For each kept slide:

- **Name** it from its layout name and its content: `Title`, `Two column`, `Quote`. Short, capitalised like a heading, unique.
- **Short, single-purpose text** becomes a **parameter**: a title, a name, a label, a statistic. The `{key}` substitutes into the designer's own runs, so the styling survives. One shape can hold several: `"{name}\n{jobTitle}"`.
- **Free-form regions** become **slots**: a text body, a table, a picture. Each slot lists what it accepts.
- **Page chrome** such as `‹#›`, footers and fixed logos is left out.
- **`variant`** is `light` or `dark`, on every layout, from the inventory's background column. When the column says the background is a picture, look at the slide's PNG from step 1.2 and judge.
- **`required`** goes on each layout's headline: the title, or the quote or the number when the layout has no title. Nothing else.
- **`description`** is one sentence for the agent that will write decks with this layout: the arrangement, and its capacity, like "holds four bullets comfortably".

Then catalog the images `extract-media` copied, under `assets` in `theme.json`, each with a `path`, a `type` and a one-line `description`. The type is `icon` for marks that must never be enlarged, `image` for pictures that may scale but not crop, and `background` for full-bleed art that may crop.

Every field, where its value comes from, and the error you get when it is wrong are in [references/theme-json.md](references/theme-json.md). Two rules fail late and are worth stating here: a table block must declare `bodyRows`, and a slot that borrows a shape from another slide must declare `frame`.

Then read the draft back against the pictures. A shape the picture shows as a subtitle but the draft calls a body is the kind of mistake to catch now.

## 2. Decide

**Goal:** every layout renders cleanly.

### Render every layout

Write `smoke.md` with one slide per layout, filling every parameter and slot with content of realistic length. `syntax.md` in the theme directory is the markdown reference. The reference theme's `showcase.md` shows what a whole deck looks like, but its layout and key names are not yours. Then:

```bash
npx tycoslide build smoke.md
soffice --headless --convert-to pdf --outdir render smoke.pptx
pdftoppm -png -r 96 render/smoke.pdf render/smoke
```

Look at every PNG yourself before showing anyone. Check each for text wrapping mid-word or overflowing its box, leftover placeholder text such as "Lorem ipsum" or "Firstname Lastname", a value landing in the wrong shape, a picture stretched or squashed, and text invisible against its background. A build error names the layout and key. Fix the map, not the content, rebuild, and repeat until clean.

Test with realistic lengths. A slot that looks right with one line can misbehave with six.

Two things that look like failures are not. A warning that an image `shrunk` or `leaves the frame empty` means the picture is a different size or shape from its slot; judge it from the PNG. A mermaid fence needs Chrome, which tycoslide finds on its own; if the build says it found no browser, install Chrome or pass `--browser-path`.

## 3. Pack

**Goal:** a self-contained skill.

### 3.1 Assets

The catalog is written. Check it: every description names what the picture shows, because deck authors grep the catalog for it, and byte-identical duplicates are dropped.

### 3.2 Fonts, code and diagrams

- **`fonts`** only affect diagrams. PowerPoint uses the template's own fonts. Declare the body font as a package such as `@fontsource/inter`, listed in `dependencies`, so mermaid text matches. If the body font has no fontsource package, use the heading font or the nearest one that does.
- **`codeTheme`** is a Shiki theme name, or a `{ "light": ..., "dark": ... }` pair when layouts of both variants can hold code.
- **`mermaid`** holds one entry per variant with all eleven keys, and **`mermaidVariant`** names the default. Keep the reference theme's block and change the hexes to the template's color scheme. Read the hex values rather than trusting the slot names, since a scheme can be inverted with `dk1` white, and diagram text must be the color body text has on that surface.

### 3.3 Package

```bash
npx tycoslide package
```

That writes `manifest.json`, `assets.json`, `SKILL.md` and `syntax.md`, and zips the theme into `<name>.zip`. Build `smoke.md` once more to prove the packaged files work.

### Hand-off

Open the render folder so the user can see every layout (`open render/` on macOS, `xdg-open render/` on Linux). Then tell them, in this order: where the theme is; the layouts, one line each with its PNG's path; what was dropped; the assets that ship; the fonts and colors you inferred; how to change any of it, which is to rename a layout or key in `theme.json`, drop extra pictures under `assets/` and catalog them, then run `npx tycoslide package` again; and how to install the zip: it is an Agent Skill, so it goes wherever their agent keeps skills, unzipped with `npm install` run once inside it for a local agent, or uploaded as-is to a hosted one. From then on, "write me a deck" in a chat produces an editable `.pptx` in the exact brand.
