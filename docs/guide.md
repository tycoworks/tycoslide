# How to build slides from your PowerPoint template

This guide shows you how to use tycoslide to build editable PowerPoint slides from markdown on your template. You'll turn the template into a theme, build a first deck, and package the theme as an agent skill, so anyone on your team can build on-brand slides with their agent.

## What you'll need

- **Your template**, as a `.pptx` file. A Google Slides template downloaded as a `.pptx` works too.
- **An AI agent that supports [agent skills](https://agentskills.io)**, such as [Claude Code](https://claude.com/product/claude-code), which this guide uses.
- **[Node.js](https://nodejs.org) 23.6 or later, and [Git](https://git-scm.com).**
- **[LibreOffice](https://www.libreoffice.org) and [poppler](https://poppler.freedesktop.org)**, which the agent installs if they're missing.

## Step 1: Create a theme

Package your .pptx, fonts, colors, and images into a tycoslide theme. You can use the create-theme agent skill, as this guide does, or clone and edit the example [tycoworks-theme](https://github.com/tycoworks/tycoworks-theme) with the [theme reference](theme.md).

First, check that every text box in your template has example text, including a bullet at each indent level you'll use. tycoslide copies the styles it can see, so a text box with no example bullet can't take bullets.

Then install the [create-theme](../skills/create-theme) skill in the folder where you want your theme:

```bash
npx skills add tycoworks/tycoslide -a claude-code
```

Start Claude Code in that folder, and ask:

> Turn ~/Downloads/acme.pptx into a tycoslide theme.

You get a theme folder with an image of each layout, and the agent tells you where it is. Your template isn't changed.

Before you write any decks, check two things:

- **The names.** The agent names each layout and its fields, such as `Two column` with `title`, `col1_body`, and `col2_body`. Every deck uses these names, so ask the agent to rename any now. Renaming later means updating every deck.
- **The images.** The theme lists the images decks can reuse, such as logos and icons, in `assets.json`. To add your own, such as customer logos, copy them into the theme's `assets` folder and ask the agent to catalog them.

## Step 2: Build your slides

Write your slides in markdown, then build them into an editable PowerPoint file. Here's a two-slide deck for the tycoworks theme. For your own theme, use your layout and field names:

```markdown
---
theme: ../theme.json
---

---
layout: Title
title: Acme for finance teams
name: Jane Smith
jobTitle: Product Marketing, Acme
---

---
layout: Two column
title: What changes with Acme
---

::col1_body::

**Today**

- Month-end close takes two weeks
- Reports are rebuilt by hand

::col2_body::

**With Acme**

- Close the books in three days
- Reports update as the numbers change
```

Save it as `collateral/first-call.md` in your theme folder, and build it from there:

```bash
npx tycoslide build collateral/first-call.md
```

tycoslide saves `first-call.pptx` next to the markdown, on your template and fully editable, or stops with an error saying what to fix. Put quotes around any title that contains a colon. The [markdown reference](markdown.md) covers tables, images, speaker notes, code, and Mermaid diagrams, and the tycoworks theme's [showcase deck](https://github.com/tycoworks/tycoworks-theme/blob/main/showcase.md) uses every layout.

Because decks are text, you can keep them in Git with the theme (`git init`) and change many at once. Ask your agent to edit the decks in `collateral`, check the diff, and rebuild them all:

```bash
for deck in collateral/*.md; do npx tycoslide build "$deck"; done
```

## Step 3: Package your theme as a skill

Turn your theme into an agent skill and share it with your team. From your theme folder, package the theme and install the zip in Claude Code, using your zip's name:

```bash
npx tycoslide package
unzip acme-theme.zip -d ~/.claude/skills/
```

Then open Claude Code where you keep your notes, and ask for a deck:

> Build me a first-call deck for Globex, using my notes in call-notes.md.

You get the markdown and the PowerPoint file side by side. The markdown can't change a font or move a shape, so every deck stays on your template.

To share the skill, colleagues on Claude Code unzip the same file into their skills folder, and colleagues on the Claude app upload it under Customize > Skills. On a Claude Team or Enterprise plan, an admin can [add it for everyone](https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization). When you change the theme, run `npx tycoslide package` again and share the new zip. Colleagues on Claude Code should delete their old skill folder first.

## Current limitations

- Each theme holds one PowerPoint file, so a pitch deck and a one-pager need separate themes.
- There's no support for charts yet, and Mermaid diagrams become images.
- The agent's previews use LibreOffice, so their line breaks can differ slightly from PowerPoint's.
- In the Claude app, the skill needs network access the first time it runs, and that route hasn't been widely tested.

If something breaks, open an [issue](https://github.com/tycoworks/tycoslide/issues).
