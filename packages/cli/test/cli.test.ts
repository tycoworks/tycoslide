// CLI tests — behavior-focused: does the right thing happen from the user's perspective?

import * as assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";

const CLI = join(import.meta.dirname, "..", "dist", "index.js");

function run(args: string[], cwd?: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      encoding: "utf-8",
      cwd,
      timeout: 10000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stderr || err.stdout || "", exitCode: err.status ?? 1 };
  }
}

describe("tycoslide CLI", () => {
  test("no arguments shows help", () => {
    const { stdout } = run([]);
    assert.ok(stdout.includes("tycoslide") || stdout.includes("build"), "should show usage info");
  });

  test("build with missing file fails with descriptive error", () => {
    const { stdout, exitCode } = run(["build", "nonexistent.md"]);
    assert.strictEqual(exitCode, 1);
    assert.ok(stdout.includes("not found") || stdout.includes("nonexistent"), "should mention the missing file");
  });

  test("build with no theme specified fails with guidance", () => {
    const tmp = mkdtempSync(join(tmpdir(), "tycoslide-test-"));
    const md = join(tmp, "no-theme.md");
    writeFileSync(md, "---\nlayout: body\n---\n\n# Hello\n");

    const { stdout, exitCode } = run(["build", md]);
    assert.strictEqual(exitCode, 1);
    assert.ok(stdout.includes("theme"), "should mention theme is missing");
  });

  test("build with nonexistent theme fails with install hint", () => {
    const tmp = mkdtempSync(join(tmpdir(), "tycoslide-test-"));
    const md = join(tmp, "bad-theme.md");
    writeFileSync(md, "---\ntheme: nonexistent_theme\n---\n\n---\nlayout: body\n---\n\n# Hello\n");

    const { stdout, exitCode } = run(["build", md]);
    assert.strictEqual(exitCode, 1);
    assert.ok(stdout.includes("nonexistent_theme"), "should name the missing theme");
    assert.ok(stdout.includes("install"), "should suggest npm install");
  });

  test("--help shows build command", () => {
    const { stdout } = run(["--help"]);
    assert.ok(stdout.includes("build"), "should list the build command");
  });

  test("build --help shows options", () => {
    const { stdout } = run(["build", "--help"]);
    assert.ok(stdout.includes("--preview") || stdout.includes("-p"), "should show preview option");
  });
});
