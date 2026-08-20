# Two queued builds: code-theme light/dark + skill-as-build-artifact

> Status: **designed, not built (Aug 2026).** Both surfaced from the ultra smoke test of the
> mz-slides theme. Execute in a fresh session. Keep `npm run typecheck && npm test && npm run lint`
> green. tycoslide is the source of truth; mz-slides consumes it via npm + `tycoslide plugin`.

## Task 1 — code layouts need a light AND a dark Shiki theme (the "fix the theme" ask)

**Problem (confirmed via smoke test):** `codeTheme` is a **single theme-level string** today
(`src/markdown/blocks/code.ts:28`, `src/markdown/schema/themeConfigSchema.ts:127`). The mz-slides
theme has BOTH a "Code block dark" and a "Code block light" layout, but `codeTheme: "github-dark"`
applies to both → the light layout renders washed-out (dark syntax foreground on a light panel).
The slice-2 "one code style per theme" decision (see composition-vs-content-paradigm.md §7 note 4)
is too strict for a theme with both light and dark code surfaces.

**Fix (minimal, back-compatible):** let `codeTheme` be a string OR a `{ light, dark }` pair, and
let a layout declare its `variant`. Resolve the theme by the code layout's variant.

Files:
1. `src/markdown/schema/themeConfigSchema.ts` — `codeTheme`: `z.union([z.string(),
   z.object({ light: z.string(), dark: z.string() }).strict()]).optional()`. Layout schema: add
   `variant: z.enum(["light","dark"]).optional()`.
2. `src/markdown/types.ts` — `CompilerThemeConfig.codeTheme?: string | { light: string; dark: string }`;
   layout type gains `variant?: "light" | "dark"`; `ResolveContext` gains `layoutVariant?: "light" | "dark"`.
3. `src/markdown/deckCompiler.ts` — thread the current layout's `variant` into the `ResolveContext`
   built for block compilation (where `ctx.layoutName`/`ctx.slideIdx` are set).
4. `src/markdown/blocks/code.ts` — replace `const theme = ctx.config.codeTheme` (line 28) with:
   resolve `codeTheme` → if string, use it; if a pair, pick `pair[ctx.layoutVariant ?? "dark"]`.
   Keep the existing fail-fast when nothing is declared.
5. Test (`node:test`): (a) string `codeTheme` still works (back-compat — existing 272 tests must stay
   green); (b) a `{light,dark}` pair + a `variant:"light"` layout highlights with the light theme;
   (c) `variant:"dark"`/absent → dark theme. Assert the run colors differ between the two.

Then mz-slides `theme.json`: `codeTheme: { dark: "github-dark", light: "github-light" }`, and tag
the "Code block light" layout `"variant": "light"` (dark layout may stay untagged = dark default).
Recommended Shiki ids: `github-dark` + `github-light` (matched pair, most faithful); alternatives
`one-dark-pro` + `min-light` for more contrast.

**Verify end-to-end:** `npm link` the local tycoslide into mz-slides (or install the packed tarball),
rebuild `stress-test.md`, render slides 31 (dark) + 32 (light) to PNG — light code must be legible.

## Task 2 — stop committing the generated skill; make it a build artifact (#5)

**Confirmed mechanism:** `tycoslide plugin` (`src/cli.ts:73-101`) already **generates** the whole
skill: `copyFileSync` of `SKILL.md` + `syntax.md` from the installed tycoslide package, and writes
`manifest.json` from `theme.json`, into `skills/slides/`. mz-slides currently **commits** those
generated files → drift (the reason a manual `cp` was ever needed). mz-slides `postinstall` already
runs `tycoslide plugin`, so a fresh `npm install` regenerates them.

**Change (in mz-slides):**
- `.gitignore` the generated files: `skills/slides/SKILL.md`, `skills/slides/syntax.md`,
  `skills/slides/manifest.json`. (Keep any hand-authored `brand.md` committed.)
- Add `npm run package`: `tycoslide package && (cd skills && zip -r ../slides-skill.zip slides)` —
  produces an uploadable Agent Skill zip per
  https://support.claude.com/en/articles/12512198-how-to-create-custom-skills
- Update mz-slides `README.md` step 4 (currently "regenerate … and commit them") → "generated on
  install; run `npm run package` to build the distributable skill zip."
- Result: one source of truth (tycoslide package for SKILL/syntax, theme.json for manifest), zero
  committed duplication, no more copypasta.

### Skill/plugin terminology + doc-compliance (from the Agent Skills doc)

Two DIFFERENT distribution artifacts, easy to conflate:
- **Agent Skill** (the support doc): a folder `slides/` with `SKILL.md` (frontmatter `name` ≤64
  chars, `description` ≤200 chars, optional `dependencies`) + resources, zipped with the FOLDER at
  the zip root (`slides/SKILL.md`, not files at root). Uploaded via claude.ai Customize > Skills.
  **No plugin.json.**
- **Claude Code plugin**: `.claude-plugin/plugin.json` manifest that can bundle skills + commands +
  agents + hooks + MCP, installed via CC marketplaces. A plugin CONTAINS a skill. Different channel.

So the primary artifact for "match that doc" is the **Agent Skill zip**; `plugin.json` is an optional
wrapper only for the Claude-Code-plugin channel.

Concrete gaps to fix so the output is a valid uploadable Agent Skill:
1. **`description` is too long.** SKILL.md frontmatter `description` is multi-line, well over the
   **200-char** limit → would be rejected on upload. Trim to ≤200 chars (keep the trigger phrases).
2. **Command naming.** `tycoslide plugin` misleads (primary output is a Skill, not a plugin). Rename
   to `tycoslide package` (or `tycoslide package`); make the `.claude-plugin/plugin.json` output opt-in
   behind a `--plugin` flag for the CC-marketplace channel. Update mz-slides `postinstall`.
3. **Casing:** doc example says `skill.md`; Claude Code uses `SKILL.md`. Confirm the target channel's
   accepted casing before finalizing (SKILL.md is the safer default for CC; claude.ai accepts it too).
4. **Zip root** must be the `slides/` folder (the `(cd skills && zip … slides)` form is correct).
5. Optionally emit `dependencies` in the frontmatter (needs tycoslide/node) per the doc.

### DECISION (user): drop the plugin, ship a Skill; tycoslide is the theme-lifecycle CLI
- **Remove `.claude-plugin/plugin.json` output entirely** (the Agent Skills doc has no plugin concept).
  `tycoslide plugin` → **`tycoslide package`**: emit only the doc-compliant Skill folder + zip.
- **Add `tycoslide init <name> <template.pptx>`** — scaffold a new theme project (template/, assets/,
  theme.json stub, brand.md stub, package.json depending on tycoslide with `build`/`package` scripts).
- Full theme lifecycle, one CLI: `tycoslide init` (scaffold) → author theme.json/assets (later the
  sampler auto-derives) → `tycoslide build deck.md` (decks) → `tycoslide package` (→ slides-skill.zip).
- Scaffolded package.json just ALIASES these (`npm run build` → `tycoslide package`), so logic lives in
  tycoslide, invocation feels local to the theme.

### Where the build command lives (theme-build UX)
- **Packaging LOGIC stays in tycoslide** (`tycoslide package`/`package`) — identical for every theme;
  duplicating it per-theme would re-create the copypasta problem one level up.
- **Invocation lives in the theme repo** (mz-slides `npm run build`/`package`) — standing in the
  theme, one command yields the skill zip. Thin script → calls the tycoslide CLI.

**NB drift created this session:** SKILL.md was hand-`cp`'d into mz-slides ahead of its installed
tycoslide (still 0.9.0). Once tycoslide ships the edited SKILL.md and mz-slides updates the dep,
`tycoslide plugin` regenerates correctly and the manual copy is moot. Do NOT rely on the hand-copy.

## Ordering
Publish tycoslide with the edited SKILL.md **and** Task 1 together (one release), then rewire
mz-slides (Task 2 + theme.json code pair). That way mz-slides' regenerated skill and its code-theme
fix land in one consistent step.
