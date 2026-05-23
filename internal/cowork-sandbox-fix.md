# Cowork Sandbox Compatibility

## Problem

The tycoslide CLI fails on rebuilds in Claude's cowork environment (and likely similar sandboxed/mounted filesystems).

### Root cause

`build.ts` wipes the build directory on every run:

```typescript
const outputDir = path.resolve(`${basename}-build`);
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
```

Cowork mounts the working folder as a write-once filesystem: files can be created and overwritten, but not deleted (`unlink` returns `EPERM: operation not permitted`). The first build succeeds (empty folder), but every subsequent build crashes with an uncaught `rimrafSync` stack trace.

### Secondary issue

The `.pptx` output path (`path.resolve(`${basename}.pptx`)`) also fails if the mounted filesystem does not allow overwrite via the same path (though testing showed `cp` overwrites work in cowork).

---

## Observed Behavior (from cowork test report)

> The very first build succeeds (empty folder, nothing to delete), but the second build crashes -- and not gracefully. It throws a raw, uncaught Node.js stack trace ending in rimrafSync, with no friendly "couldn't clean build directory" message. A normal user would see an alarming wall of internal error text.

The workaround used by the agent was to relocate the entire build into `/tmp`, symlink installed packages back, build there, and copy only the finished `.pptx` to the output folder.

---

## Additional Issues Found in Cowork Testing

### 1. Overflow on first build (expected)

The skill documentation says "Assume the first build will fail," and it does. An agenda slide with five items overflowed by 10-34px. The manifest states agenda accepts "3-5 items," but five items only fit if each is short and single-line. In practice the limit is "3-5 short, single-line items." Trimming to four items built cleanly.

**Action:** Update manifest.json limits documentation to clarify single-line constraint.

### 2. Broken internal links in reference docs

The reference guides bundled in the plugin contain broken links to `themes.md`, `quick-start.md`, and `templates.md` -- none of which exist in the skill package. `troubleshooting.md` tells users to "check template slot names in templates.md," but that file is not included (the info lives in `manifest.json`). `components.md` exists but is missing from the SKILL.md "Quick Reference" table.

**Action:** Audit reference doc cross-links. Either bundle all referenced docs or rewrite links to point to `manifest.json` / bundled files.

### 3. Branding name inconsistency

The skill referred to "Tycho Slide" in places -- the correct name is `tycoslide`, one word, lowercase.

**Action:** Grep skill output and docs for case-insensitive "tycho slide" variants.

### 4. Build artifacts left behind

`node_modules` and stray build artifacts remain in the working folder after builds. In cowork these cannot be deleted due to the write-once constraint.

**Action:** The temp-dir fix (below) addresses this -- build artifacts stay in `/tmp` and only final outputs are copied out.

---

## What Worked Well

- `npm install` + Chromium download worked first try when documented
- `manifest.json` template catalog (whenToUse, limits, gotchas) made template selection straightforward
- Overflow error messages were precise and actionable (exact pixel overages)
- The skill's required subagent QA review caught a slide ordering issue

---

## Recommended Fix

**Strategy:** Build into `os.tmpdir()`, copy final outputs to target locations.

### Why temp-dir, not catch-and-continue

The `rmSync` is not just cleanup. The build writes HTML files, slide images, and other artifacts into the build directory. If old files linger from a previous build, you get stale preview artifacts mixed with new ones. A clean temp dir guarantees correctness.

### Changes to `packages/cli/src/build.ts`

```typescript
import os from "node:os";

// Replace:
//   const outputDir = path.resolve(`${basename}-build`);
//   fs.rmSync(outputDir, { recursive: true, force: true });
//   fs.mkdirSync(outputDir, { recursive: true });
//
// With:
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tycoslide-"));
const outputDir = path.resolve(`${basename}-build`);

// ... run all build operations against tempDir ...

// After build: copy outputs to user-facing locations
try {
  // Clean output dir if possible (normal local usage)
  fs.rmSync(outputDir, { recursive: true, force: true });
} catch (err: any) {
  if (err.code !== "EPERM") throw err;
  // Sandboxed filesystem -- outputDir can't be wiped, skip it
}
fs.mkdirSync(outputDir, { recursive: true });

// Copy HTML previews from tempDir to outputDir (best-effort)
for (const file of fs.readdirSync(tempDir)) {
  try {
    fs.copyFileSync(path.join(tempDir, file), path.join(outputDir, file));
  } catch (err: any) {
    if (err.code !== "EPERM") throw err;
    // Can't overwrite in sandboxed fs -- skip stale preview
  }
}

// Copy .pptx to target (overwrite works in cowork via cp)
const pptxTemp = path.join(tempDir, `${basename}.pptx`);
const pptxTarget = path.resolve(`${basename}.pptx`);
fs.copyFileSync(pptxTemp, pptxTarget);

// Cleanup temp dir
fs.rmSync(tempDir, { recursive: true, force: true });
```

### Key behaviors

| Environment | Behavior |
|-------------|----------|
| Normal local | Identical to today: clean build dir, fresh outputs, temp dir cleaned up |
| Cowork/sandbox | Build in temp dir, copy outputs, EPERM on cleanup is silently handled |
| First build (either) | Works -- outputDir is created fresh |
| Rebuild (either) | Works -- temp dir is always clean, outputDir overwrite is best-effort |

### Error handling

Add a user-friendly message if the build dir can't be cleaned:

```typescript
} catch (err: any) {
  if (err.code !== "EPERM") throw err;
  // Sandboxed filesystem detected -- build continues with temp dir
}
```

No scary stack traces. The build just works.

---

## Plugin Documentation Fixes

Separate from the build fix, these should be addressed:

1. Update agenda template limits in manifest.json: "3-5 short single-line items" not "3-5 items"
2. Audit and fix broken cross-links in bundled reference docs
3. Add `components.md` to SKILL.md Quick Reference table
4. Ensure "tycoslide" is always lowercase, one word
5. Consider bundling `templates.md` or rewriting references to point to manifest.json
