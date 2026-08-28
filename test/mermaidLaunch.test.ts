import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { launchChromium } from "../dist/markdown/blocks/mermaid.js";

/** Stub standing in for playwright-core's `chromium`, recording how it was launched. */
const stub = (behaviour: (opts: Record<string, unknown>) => unknown) => {
  const calls: Record<string, unknown>[] = [];
  const chromium = {
    launch: async (opts: Record<string, unknown> = {}) => {
      calls.push(opts);
      const out = behaviour(opts);
      if (out instanceof Error) throw out;
      return out;
    },
  };
  return { chromium, calls };
};

describe("launchChromium", () => {
  it("prefers the explicit executable and never checks the build revision", async () => {
    const { chromium, calls } = stub(() => "browser");
    assert.equal(await launchChromium(chromium as never, "/opt/pw-browsers/chrome"), "browser");
    assert.equal(calls.length, 1, "stops at the first success");
    assert.equal(calls[0].executablePath, "/opt/pw-browsers/chrome");
  });

  it("falls back to system Chrome, then to Playwright's own browser", async () => {
    const { chromium, calls } = stub((opts) => (opts.channel ? new Error("no chrome") : "browser"));
    assert.equal(await launchChromium(chromium as never), "browser");
    assert.deepEqual(
      calls.map((c) => c.channel),
      ["chrome", undefined],
      "system Chrome first, bare launch second",
    );
  });

  it("names every remedy when no browser can be launched", async () => {
    const { chromium } = stub(() => new Error("Executable doesn't exist"));
    await assert.rejects(launchChromium(chromium as never, "/nope/chrome"), (e: Error) => {
      assert.match(e.message, /No Chromium available/);
      assert.match(e.message, /--browser-path/, "names the flag");
      assert.match(e.message, /Google Chrome/, "names the system browser");
      assert.match(e.message, /playwright install chromium-headless-shell/, "names the install command");
      assert.match(e.message, /\/nope\/chrome/, "reports what it actually tried");
      return true;
    });
  });
});
