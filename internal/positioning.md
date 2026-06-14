# tycoslide Positioning

## One-liner

**Headless brand engine for collateral-as-code.** Structured content in, pixel-perfect branded PPTX out.

## Product Framing

tycoslide is a **headless brand compliance engine** that generates editable PowerPoint slides from markdown/structured content, with TypeScript-defined themes as the brand enforcement layer.

Think: headless CMS (Contentful) vs WordPress, but for branded collateral instead of web content.

## The Problem

AI can generate content. AI cannot generate on-brand collateral. Every company with a design system has the same problem: the output of LLMs, CRMs, and content tools does not respect brand guidelines. Salespeople paste AI text into ugly slides. Product marketers manually format the same battle card for the 50th time.

## The Insight

Brand compliance is a build-time constraint, not a design-time activity. Define the rules once (as code), enforce them automatically on every generation. The brand rules are the product, not the content authoring.

## How tycoslide Solves It

- **Theme = brand rules as code.** TypeScript-defined design tokens, layouts, and components. Version-controlled, testable, CI-friendly.
- **Input = structured content.** Markdown, or any structured data an LLM can produce.
- **Output = pixel-perfect branded PPTX.** Editable native PowerPoint objects, not screenshots.
- **Build-time validation.** Layout overflows, missing tokens, invalid parameters caught before output.

## Competitive Landscape

| Tool | Approach | Authoring | Output | Brand enforcement |
|------|----------|-----------|--------|-------------------|
| **Templafy** ($1B+) | Enterprise SaaS, Office plugin | GUI (inside PowerPoint) | Editable PPTX | Lock regions, admin portal |
| **Gamma/Tome/Beautiful.ai** | AI slide builders | GUI (web) | Web-native, PPTX export | Minimal |
| **Marp/Slidev/reveal.js** | Markdown-to-slides | Code (markdown + CSS) | HTML/PDF (PPTX = screenshots) | CSS themes |
| **python-pptx/PptxGenJS** | Programmatic PPTX | Code (Python/JS) | Editable PPTX | None (manual positioning) |
| **tycoslide** | Headless brand engine | Code (markdown + TypeScript) | Editable PPTX | Theme = code-defined rules |

**Unique intersection:** code-authored + theme-controlled + editable native PPTX. No other tool occupies this space.

## vs Templafy Specifically

Templafy assumes PowerPoint is the authoring surface. tycoslide treats PPTX as an output format.

- Templafy's buyer: IT admin giving 10,000 salespeople guardrails inside PowerPoint
- tycoslide's buyer: engineer/product marketer generating collateral from data without touching PowerPoint

Templafy's patent (US 12,572,733) covers cloud-based enterprise SaaS with AI + templates + Office plugin + CRM data pull. Does not cover CLI tools, code-defined themes, or markdown-to-PPTX. No infringement risk.

## Go-to-Market: Consulting First

1. **Theme implementation consulting.** Build branded tycoslide themes for companies. Productized service.
2. **Learn buyer pain points.** Consulting reveals what companies actually need beyond themes.
3. **Wrap the engine.** API/service that accepts structured content and returns branded PPTX. The rendering engine becomes infrastructure.

Open-source engine, paid theme implementation. Own the long tail that Templafy ignores (startups, dev teams, indie product marketers — anyone who wants brand-constrained AI collateral without an enterprise contract).

## Narrative: Collateral as Code

"Product marketing as code" (PMaC). Theme repos are brand infrastructure. `npm run build` is your brand compliance check. Version control is your audit trail. CI/CD is your distribution mechanism.