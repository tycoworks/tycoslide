# NPM Publishing

Plan and checklist for publishing `tycoslide`, `tycoslide-components`, and `tycoslide-theme-default` to npm.

---

## Target State

A user runs:

```bash
npm install tycoslide tycoslide-components tycoslide-theme-default
```

Creates `slides.md`, then:

```bash
npx tycoslide build slides.md
```

Gets `slides.pptx`. That's it.

---

## Tooling Decision: No Turborepo Needed

npm workspaces handles publishing for a 3-package monorepo. Turborepo is a build caching/orchestration tool — not a publishing tool. At this scale (fast TypeScript builds, ~seconds), caching and parallelism provide minimal value. Turborepo has no built-in publish command. Skip it.

Similarly, **Changesets** and **Lerna** are not needed initially. Manual version bumping via `npm version --workspaces` is fine for a solo/small team. Consider Changesets later if multiple contributors need coordinated releases.

The 4th package (`tycoslide-integration-tests`) has `"private": true` and is automatically skipped by `npm publish --workspaces`.

---

## Publish Workflow

```bash
# 1. Bump all package versions together
npm version minor --workspaces --no-git-tag-version

# 2. Update inter-workspace dependency ranges (see checklist item 2)
# e.g., tycoslide-components depends on tycoslide "^1.1.0"

# 3. Build all packages
npm run build

# 4. Run tests
npm test

# 5. Dry-run to verify package contents
npm pack --workspaces --dry-run

# 6. Publish in dependency order (core → components → theme)
npm publish --workspace=packages/core --access public
npm publish --workspace=packages/components --access public
npm publish --workspace=packages/theme-default --access public

# 7. Commit, tag, push
git add -A
git commit -m "release v1.x.0"
git tag v1.x.0
git push --follow-tags
```

Publish order matters: components depends on core, theme depends on both. `npm publish --workspaces` doesn't guarantee topological order.

---

## The pptxgenjs Patch Problem

tycoslide patches pptxgenjs via `patch-package` with 4 critical fixes:

1. **Rich text arrays in slide masters** — masters accept `TextRun[]` arrays, not just plain strings
2. **Paragraph properties on first run only** — prevents duplicate `<a:pPr>` blocks that corrupt the file
3. **Slide number visibility** — `sldNum="1"` enables slide number placeholders
4. **Customizable hyperlink color** — `theme.hlinkColor` flows into the OOXML theme XML

These patches are essential — without them, tycoslide's output is broken.

**The problem:** `patch-package` runs as a `postinstall` hook and looks for a `patches/` directory in the *consumer's project root*, not in the installed package's directory. When someone installs `tycoslide` from npm, the postinstall runs `patch-package` which (a) isn't installed (it's a devDependency) and (b) can't find the patches even if it were.

### Decision: Fork pptxgenjs

The upstream pptxgenjs repo hasn't been updated in ~10 months and some of the bugs these patches fix have been open for years. Contributing upstream is good citizenship but can't be depended on for timeline.

**Plan:**

1. Fork the pptxgenjs GitHub repo
2. Apply the 4 fixes to the **source files** (not just the compiled dist — the current patches modify dist, so you need to locate the corresponding source locations and make changes there)
3. Build the fork
4. Change `package.json` name to `@tycoslide/pptxgenjs`
5. Publish to npm: `npm publish --access public`
6. Update `packages/core/package.json` to depend on `@tycoslide/pptxgenjs` instead of `pptxgenjs`
7. Remove `patch-package` from devDependencies and the `postinstall` script
8. Delete the `patches/` directory

**Also do (good citizenship, low effort):** Open a PR from your fork to the original repo with the fixes. If it ever gets merged, you can switch back to official pptxgenjs and deprecate the fork. But don't block on this.

**Import paths:** Since `@tycoslide/pptxgenjs` is a different package name, all `import ... from 'pptxgenjs'` statements in tycoslide need updating to `import ... from '@tycoslide/pptxgenjs'`. Search for all pptxgenjs imports in `packages/core/src/`.

---

## Checklist

### 1. Add `files` field to all three packages

Currently `npm pack --dry-run` shows everything being published: `src/`, `test/`, `tsconfig.json`, test fixtures. Core publishes 186 files (1MB); should be ~50 files.

Add to each package's `package.json`:

```json
{ "files": ["dist/"] }
```

npm always includes `package.json`, `README.md`, `LICENSE` automatically. Everything else (source, tests, configs) is excluded.

**For `tycoslide-theme-default`:** The `dist/` directory includes font files from `@fontsource/inter` and `@fontsource/fira-code` — these are large (~3.6MB total). This is correct — the theme must ship its fonts. But verify that `examples/` and `src/` are excluded.

### 2. Pin inter-workspace dependency versions

Currently `tycoslide-components` and `tycoslide-theme-default` use `"tycoslide": "*"`. npm does NOT rewrite `"*"` to the real version on publish. Consumers would get `"tycoslide": "*"` which resolves to whatever's latest on npm — potentially a future breaking version.

Change to real version ranges:

**`packages/components/package.json`:**
```json
{ "dependencies": { "tycoslide": "^1.0.0" } }
```

**`packages/theme-default/package.json`:**
```json
{ "dependencies": { "tycoslide": "^1.0.0", "tycoslide-components": "^1.0.0" } }
```

During local development, npm workspaces still resolves these to symlinks — the version range only matters for consumers installing from the registry.

**Bump workflow:** After `npm version --workspaces`, update these ranges to match. Or use `--workspaces-update` flag (npm v8+) which does this automatically.

### 3. Resolve the pptxgenjs patch

See "The pptxgenjs Patch Problem" section above. Must be resolved before publishing — current `postinstall: patch-package` will not work for consumers.

### 4. Fix lifecycle scripts in core

**`postinstall: "patch-package"`** — Remove once the fork/upstream fix is in place. Until then, this will error for consumers.

**`prepare: "tsc && chmod +x dist/cli/index.js"`** — The `prepare` hook runs on `npm install` for git-based installs, meaning consumers installing from git would need TypeScript. Change to `prepublishOnly`:

```json
{
  "scripts": {
    "build": "tsc && chmod +x dist/cli/index.js",
    "prepublishOnly": "npm run build"
  }
}
```

`prepublishOnly` only runs during `npm publish`, not during consumer installs.

### 5. Add `engines` field

```json
{ "engines": { "node": ">=18.0.0" } }
```

Add to all three published packages. Node 18 is the minimum (ESM support, stable fetch). Node 16 is EOL.

### 6. Verify CLI shebang

`packages/core/src/cli/index.ts` line 1 has `#!/usr/bin/env node` — confirmed present. TypeScript preserves shebangs in output. The `chmod +x dist/cli/index.js` in the build script ensures it's executable.

### 7. Consider peerDependencies

Optional but follows npm conventions. Since `tycoslide-components` extends the `tycoslide` framework, listing it as a peerDependency signals the relationship correctly and prevents duplicate copies:

```json
{
  "peerDependencies": { "tycoslide": "^1.0.0" },
  "devDependencies": { "tycoslide": "*" }
}
```

Since npm 7+, peerDependencies are auto-installed, so consumers get it either way. The README/quick-start already tell users to install all three explicitly, so either approach works. Start with regular `dependencies` for simplicity; switch to `peerDependencies` later if deduplication issues arise.

### 8. Verify docs accuracy

**README.md** — Install command is correct: `npm install tycoslide tycoslide-components tycoslide-theme-default`. Build command is correct: `npx tycoslide build slides.md`.

**docs/quick-start.md** — Same install command, plus `npx tycoslide --version` verification step. Correct.

**Minor inconsistency:** README lists packages as `tycoslide tycoslide-theme-default tycoslide-components` (theme before components); quick-start lists `tycoslide tycoslide-components tycoslide-theme-default` (components before theme). Order doesn't matter functionally but should be consistent.

### 9. Add README to each package

npm shows the package README on the registry page. Each package should have its own README:

- `packages/core/README.md` — main tycoslide README (can be the root README or a subset)
- `packages/components/README.md` — brief description, link to main docs
- `packages/theme-default/README.md` — brief description, link to main docs

### 10. Dry-run verification

Before the real publish, verify each package:

```bash
npm pack --workspaces --dry-run
```

Check:
- [ ] Only `dist/` files, `package.json`, `README.md`, `LICENSE` are included
- [ ] No `src/`, `test/`, `tsconfig.json`, `.env`, or test fixtures
- [ ] Font files are present in theme-default's dist
- [ ] `dist/cli/index.js` has shebang (inspect with `head -1`)
- [ ] No patches directory

### 11. npm account and access

- [ ] Create an npm account (or use existing)
- [ ] Run `npm login`
- [ ] Decide on scope: publish as `tycoslide` (unscoped) or `@tycoslide/core` (scoped). Current names are unscoped — check availability with `npm view tycoslide`.
- [ ] First publish must use `--access public` for unscoped packages (or scoped with public access)

---

## Execution Order

1. **Resolve pptxgenjs patch** — fork, upstream PR, or alternative (blocks everything)
2. **Add `files` field** to all three package.json files
3. **Pin dependency versions** — replace `"*"` with `"^1.0.0"`
4. **Fix lifecycle scripts** — remove postinstall, change prepare to prepublishOnly
5. **Add `engines` field** to all three packages
6. **Add per-package README** files
7. **Consistency pass** — align install command order in README vs quick-start
8. **Dry-run** — `npm pack --workspaces --dry-run`, inspect output
9. **npm login** and check name availability
10. **Publish** — core → components → theme-default
11. **Verify** — `mkdir /tmp/test && cd /tmp/test && npm init -y && npm install tycoslide tycoslide-components tycoslide-theme-default && npx tycoslide --version`

---

## What Stays the Same

- **Monorepo structure** — no change to `packages/*` layout
- **npm workspaces** — local development continues via symlinks
- **TypeScript project references** — `tsc --build` still works across packages
- **Consuming projects** — the `Development/tycoslide` project with integration-tests keeps its workspace setup unchanged. It uses `"tycoslide": "*"` which resolves to the local workspace, not npm.
- **Build commands** — `npm run build`, `npm test` from root, unchanged
