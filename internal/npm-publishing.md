# NPM Publishing

Standard operating procedure for publishing `@tycoslide/core`, `@tycoslide/components`, `@tycoslide/cli`, and `@tycoslide/theme-default` to npm.

---

## Target State

A user runs:

```bash
npm install @tycoslide/cli @tycoslide/theme-default
```

(`@tycoslide/core` and `@tycoslide/components` come transitively as dependencies.)

Creates `slides.md`, then:

```bash
npx tycoslide build slides.md
```

Gets `slides.pptx`. That is it.

---

## Prerequisites

These are one-time setup steps. Verify before your first publish; skip on subsequent releases.

- **npm org**: `@tycoslide` org exists on npm
- **npm login**: Run `npm login` and verify access to the org
- **`files` field**: All four package.json files have `"files": ["dist/"]"`
- **`engines` field**: All four have `"engines": { "node": ">=18.0.0" }`
- **Lifecycle scripts**: CLI has `prepublishOnly` (not `prepare` or `postinstall`)
- **CLI shebang**: `packages/cli/src/index.ts` line 1 has `#!/usr/bin/env node`
- **Per-package READMEs**: Each package has its own README for the npm registry page

---

## Release Workflow

### 1. Bump versions

```bash
npm version <patch|minor|major> --workspaces --no-git-tag-version
```

Then update inter-workspace dependency ranges to match:

- `packages/components/package.json` — `"@tycoslide/core": "^X.Y.0"`
- `packages/cli/package.json` — `"@tycoslide/core": "^X.Y.0"`
- `packages/theme-default/package.json` — `"@tycoslide/core": "^X.Y.0"`, `"@tycoslide/components": "^X.Y.0"`

### 2. Build and test

```bash
npm run build
npm test
```

### 3. Dry-run verification

```bash
npm pack --workspaces --dry-run
```

Check each package:
- Only `dist/`, `package.json`, `README.md`, `LICENSE` are included
- No `src/`, `test/`, `tsconfig.json`, `.env`, or test fixtures
- Font files are present in `@tycoslide/theme-default`'s dist
- `dist/index.js` in CLI package has shebang
- No patches directory

### 4. Publish in dependency order

```bash
npm publish --workspace=packages/core --access public
npm publish --workspace=packages/components --access public
npm publish --workspace=packages/cli --access public
npm publish --workspace=packages/theme-default --access public
```

Order matters: components and CLI depend on core, theme depends on core and components. `npm publish --workspaces` does not guarantee topological order.

(`--access public` is required for the first publish of each scoped package. Harmless on subsequent publishes.)

### 5. Deprecate old package names

On the first release under the new scope, deprecate the old `@tycoworks` packages:

```bash
npm deprecate @tycoworks/tycoslide "Moved to @tycoslide/core and @tycoslide/cli"
npm deprecate @tycoworks/tycoslide-components "Moved to @tycoslide/components"
npm deprecate @tycoworks/tycoslide-theme "Moved to @tycoslide/theme-default"
```

This is a one-time step. Skip on subsequent releases.

### 6. Commit, tag, push

```bash
git add -A
git commit -m "release vX.Y.Z"
git tag vX.Y.Z
git push --follow-tags
```

### 7. Clean-room verification

```bash
mkdir /tmp/tycoslide-test && cd /tmp/tycoslide-test
npm init -y
npm install @tycoslide/cli @tycoslide/theme-default
npx tycoslide --version
```

Create a minimal test deck and build it:

```markdown
---
theme: "@tycoslide/theme-default"
---

---
layout: title
title: Hello World
subtitle: It works!
---
```

```bash
npx tycoslide build test.md
# Should produce test.pptx
```

---

## Package Structure

| Package | npm name | Directory |
|---------|----------|-----------|
| Core | `@tycoslide/core` | `packages/core` |
| Components | `@tycoslide/components` | `packages/components` |
| CLI | `@tycoslide/cli` | `packages/cli` |
| Theme | `@tycoslide/theme-default` | `packages/theme-default` |

Users install two packages (CLI + theme). Core and components are transitive dependencies.

---

## Tooling Decisions

- **No Turborepo**: npm workspaces handles this 4-package monorepo. Turborepo is build caching, not publishing.
- **No Changesets/Lerna**: Manual version bumping via `npm version --workspaces` is fine for a solo/small team. Reconsider if multiple contributors need coordinated releases.
- **Regular dependencies (not peer)**: Components and theme use regular `dependencies` on core. Switch to `peerDependencies` later if deduplication issues arise.

---

## The pptxgenjs Fork

tycoslide depends on `@tycoworks/pptxgenjs` (a fork of pptxgenjs with 4 fixes). Published to npm under the `@tycoworks` scope. A PR to upstream is open — if merged, switch back to official pptxgenjs and deprecate the fork.
