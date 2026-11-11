# tycoslide

Read [README.md](README.md) first for what tycoslide is and how it is used. For the authoring model (layouts, slot types, syntax), see [the deck skill](theme-package/SKILL.template.md) and [markdown.md](docs/markdown.md). This file is only about working on the code.

## Build & Test

```bash
npm run typecheck    # Type-check (tsc --build)
npm test             # Run tests (node:test)
npm run lint         # Biome check
```

TypeScript runs natively via Node's `--experimental-strip-types`. `tsc --build` compiles `src/` to `dist/`, JavaScript and `.d.ts` declarations, which the CLI and the tests run.

## Releasing

`@tycoworks/tycoslide` is a single npm package (no workspaces). The published tarball ships only `dist/`, `bin/`, `docs/`, `theme-package/` (the `files` array); the `bin/tycoslide.js` shebang and `@tycoworks` publish access are assumed set up.

Commit and tag the bump **before** publishing. A publish that fails leaves a tag for a version not yet on npm, which the retry resolves; a publish that succeeds before the commit leaves npm carrying a version with no commit behind it, and the number can never be reused. Publishing requires a one-time password, so step 6 is run by hand.

1. **Check what ships is right, not just present.** `theme-package/SKILL.template.md` goes into every packaged theme as its `SKILL.md`, and both skills read `docs/` from the installed package, so a known-wrong line there (an example that no longer builds, a stale path form) is a release blocker, not a todo item.
2. **Clean-build + test** on the release branch: `npm ci && npm run build && npm test && npm run lint`. If the build reports missing exports that exist in source, `find . -name 'tsconfig.tsbuildinfo' -not -path './node_modules/*' -delete && npm run build`.
3. **Bump**: `npm version <patch|minor|major> --no-git-tag-version` (updates `package.json` + lockfile; no commit/tag).
4. **Verify the tarball**: `npm pack --dry-run` — confirm only `dist/`, `bin/tycoslide.js` (with shebang), `docs/`, `theme-package/`, `package.json`, `README.md`, `LICENSE`; no `src/`, `test/`, configs, or fixtures.
5. **Commit, tag, push**: `git commit -am "release vX.Y.Z" && git tag -a vX.Y.Z -m "vX.Y.Z" && git push --follow-tags`. The tag must be annotated: `--follow-tags` ignores lightweight ones and the tag silently stays local.
6. **Publish**: `npm publish --access public` (`--access public` required on first publish, harmless after).
7. **GitHub release**: `gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes`.
8. **Clean-room check**: in an empty dir, `npm install @tycoworks/tycoslide && npx tycoslide --version`, then build a minimal deck against a theme to confirm it renders a `.pptx`.

## Architecture

The product principles, layers and coding standards are in [ARCHITECTURE.md](ARCHITECTURE.md):

@ARCHITECTURE.md
