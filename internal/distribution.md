# tycoslide Distribution Strategy

Soft/beta launch targeting 5-10 early adopters. Not a big launch.

---

## Target Audience

**Primary**: Claude Code users who need repeatable, on-brand PPTX output — developers, technical PMs, DevRel, technical PMMs. People who already version-control everything and are frustrated that their slide workflow isn't in that system.

**Secondary**: Existing markdown-slides users (Marp, Slidev) who've hit the wall of non-editable output and need to hand off to non-technical stakeholders.

**Not targeting** (yet): Generic product marketers or broad PMM communities — too noisy for beta.

---

## Competitive Positioning

| Tool | Output | Problem |
|------|--------|---------|
| Marp | PDF, HTML, .pptx (images) | PPTX slides are rasterized screenshots, not editable |
| Slidev | HTML, PDF, .pptx (images) | Same — images in PowerPoint, not native objects |
| Reveal.js | HTML, PDF | No PPTX at all |
| Claude Cowork | PPTX via computer use | Copilot controlling a GUI — one-off, not repeatable |
| **tycoslide** | **Native .pptx (editable objects)** | **None of the above** |

**Key differentiator**: Native PowerPoint objects — text is selectable, colors are editable, layouts are real. Not images embedded in a PPTX container.

**Secondary**: TypeScript themes with design tokens. Corporate styling is predictable and repeatable. Define your brand once in code; every deck is on-brand by construction.

**Against Claude Cowork**: That's a copilot controlling a GUI — great for one-off decks, useless for automated/repeatable builds, CI pipelines, or teams that need consistent output. tycoslide is infrastructure, not a copilot.

---

## Key Messages

- "Editable PowerPoint, not images embedded in a container"
- "Define your brand once in TypeScript. Every deck is on-brand by construction."
- "Infrastructure for content, not a copilot"
- "Version-controlled, repeatable, validated"
- Early stage, actively looking for feedback

---

## Distribution Channels

### 1. Hacker News (Show HN)

Highest-leverage single action. Post Tuesday or Wednesday, 9-11am ET.

Title: `Show HN: tycoslide – CLI that generates editable .pptx from Markdown`

First comment should cover: the frustration (rebuilding decks, non-editable output), what tycoslide does differently (native objects, TypeScript themes), current state (early, looking for feedback), and an offer to explain the rendering pipeline.

### 2. Reddit

Reply to existing r/ClaudeCode thread about PowerPoint generation. The top comment asks about corporate styling — tycoslide's exact use case. Genuine reply, not promotional.

### 3. Claude Code Skill

The skill ecosystem is the distribution channel. frontend-slides got 8.3k stars as a Claude Code skill repo. When ready:
- Publish skill repo
- Submit to awesome-claude-skills, claudemarketplaces.com, skillsmp.com

### 4. Blog Posts

Two pieces:
1. **Origin story** — problem with existing tools, the editable PPTX differentiator. Builder voice.
2. **The Claude Code skill** — narrower, more technical. Demo of invoking the skill and getting .pptx output.

### 5. LinkedIn

Builder voice. Link to repo + blog post.

---

## Pre-Launch Checklist

- [ ] Demo GIF/video (30-45 seconds: markdown → build → open in PowerPoint → edit text)
- [ ] GitHub repo SEO: topics, description, homepage URL, social preview image
- [ ] GitHub Release with release notes
- [ ] README: add HTML preview screenshot to Quick Start section

---

## Execution Sequence

1. GitHub SEO + release
2. Demo GIF + README improvements
3. Reddit reply (targeted, genuine)
4. HN post
5. Blog post 1
6. LinkedIn
7. Build and publish Claude Code skill
8. Blog post 2
9. Post to r/ClaudeAI + Claude Code Discord

---

## What NOT To Do (Beta Phase)

- **Product Hunt** — requires 50-120 hours prep, wrong audience for beta
- **Broad Slack communities** — too noisy
- **Spray-and-pray Reddit** — targeted reply is worth more than 5 generic posts
