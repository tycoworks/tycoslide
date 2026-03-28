# NPM Publishing

Standard operating procedure for publishing `@tycoworks/tycoslide`, `@tycoworks/tycoslide-components`, and `@tycoworks/tycoslide-theme` to npm.

---

## Target State

A user runs:

```bash
npm install @tycoworks/tycoslide @tycoworks/tycoslide-theme
```

(`@tycoworks/tycoslide-components` comes transitively as a dependency of `@tycoworks/tycoslide-theme`.)

Creates `slides.md`, then:

```bash
npx tycoslide build slides.md
```

Gets `slides.pptx`. That's it.

---

## Prerequisites

These are one-time setup steps. Verify before your first publish; skip on subsequent releases.

- **npm org**: `@tycoworks` org exists on npm
- **npm login**: Run `npm login` and verify access to the org
- **`files` field**: All three package.json files have `"files": ["dist/"]"`
- **`engines` field**: All three have `"engines": { "node": ">=18.0.0" }`
- **Lifecycle scripts**: Core has `prepublishOnly` (not `prepare` or `postinstall`)
- **CLI shebang**: `packages/core/src/cli/index.ts` line 1 has `#!/usr/bin/env node`
- **Per-package READMEs**: Each package has its own README for the npm registry page

---

## Release Workflow

### 1. Bump versions

```bash
npm version <patch|minor|major> --workspaces --no-git-tag-version
```

Then update inter-workspace dependency ranges to match. Components and theme depend on core:

- `packages/components/package.json` → `"@tycoworks/tycoslide": "^X.Y.0"`
- `packages/theme-tycoworks/package.json` → `"@tycoworks/tycoslide": "^X.Y.0"`, `"@tycoworks/tycoslide-components": "^X.Y.0"`

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
- Font files are present in `@tycoworks/tycoslide-theme`'s dist
- `dist/cli/index.js` has shebang
- No patches directory

### 4. Publish in dependency order

```bash
npm publish --workspace=packages/core --access public
npm publish --workspace=packages/components --access public
npm publish --workspace=packages/theme-tycoworks --access public
```

Order matters: components depends on core, theme depends on both. `npm publish --workspaces` doesn't guarantee topological order.

(`--access public` is required for the first publish of each scoped package. Harmless on subsequent publishes.)

### 5. Commit, tag, push

```bash
git add -A
git commit -m "release vX.Y.Z"
git tag vX.Y.Z
git push --follow-tags
```

### 6. Clean-room verification

```bash
mkdir /tmp/tycoslide-test && cd /tmp/tycoslide-test
npm init -y
npm install @tycoworks/tycoslide @tycoworks/tycoslide-theme
npx tycoslide --version
```

Create a minimal test deck and build it:

```markdown
---
theme: "@tycoworks/tycoslide-theme"
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
| Core + CLI | `@tycoworks/tycoslide` | `packages/core` |
| Components | `@tycoworks/tycoslide-components` | `packages/components` |
| Theme | `@tycoworks/tycoslide-theme` | `packages/theme-tycoworks` |

Users install two packages (core + theme). Components is a transitive dependency of the theme.

---

## Tooling Decisions

- **No Turborepo**: npm workspaces handles this 3-package monorepo. Turborepo is build caching, not publishing.
- **No Changesets/Lerna**: Manual version bumping via `npm version --workspaces` is fine for a solo/small team. Reconsider if multiple contributors need coordinated releases.
- **Regular dependencies (not peer)**: Components and theme use regular `dependencies` on core. Switch to `peerDependencies` later if deduplication issues arise.

---

## The pptxgenjs Fork

tycoslide depends on `@tycoworks/pptxgenjs` (a fork of pptxgenjs with 4 fixes). Published to npm. A PR to upstream is open — if merged, switch back to official pptxgenjs and deprecate the fork.
