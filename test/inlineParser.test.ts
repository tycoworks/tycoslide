import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseInlineRuns } from "../dist/markdown/inline.js";

// ============================================
// parseInlineRuns
// ============================================

describe("parseInlineRuns", () => {
  it("plain text — no formatting", () => {
    const runs = parseInlineRuns("hello world");
    assert.deepEqual(runs, [{ text: "hello world" }]);
  });

  it("bold", () => {
    const runs = parseInlineRuns("before **bold** after");
    assert.deepEqual(runs, [
      { text: "before " },
      { text: "bold", bold: true },
      { text: " after" },
    ]);
  });

  it("italic", () => {
    const runs = parseInlineRuns("before *italic* after");
    assert.deepEqual(runs, [
      { text: "before " },
      { text: "italic", italic: true },
      { text: " after" },
    ]);
  });

  it("bold italic", () => {
    const runs = parseInlineRuns("***both***");
    assert.deepEqual(runs, [{ text: "both", bold: true, italic: true }]);
  });

  it("link", () => {
    const runs = parseInlineRuns("[click here](https://example.com)");
    assert.deepEqual(runs, [
      { text: "click here", link: "https://example.com" },
    ]);
  });

  it("mixed formatting", () => {
    const runs = parseInlineRuns("plain **bold** and *italic* text");
    assert.deepEqual(runs, [
      { text: "plain " },
      { text: "bold", bold: true },
      { text: " and " },
      { text: "italic", italic: true },
      { text: " text" },
    ]);
  });

  it("no formatting characters (fast path)", () => {
    const runs = parseInlineRuns("just plain text here");
    assert.deepEqual(runs, [{ text: "just plain text here" }]);
  });

  it("inline code rendered as plain text", () => {
    const runs = parseInlineRuns("use `console.log` here");
    assert.deepEqual(runs, [
      { text: "use " },
      { text: "console.log" },
      { text: " here" },
    ]);
  });

  it("bold inside link", () => {
    const runs = parseInlineRuns("[**bold link**](https://example.com)");
    assert.deepEqual(runs, [
      { text: "bold link", bold: true, link: "https://example.com" },
    ]);
  });

  it("empty string", () => {
    const runs = parseInlineRuns("");
    assert.deepEqual(runs, [{ text: "" }]);
  });

  it("strikethrough", () => {
    const runs = parseInlineRuns("before ~~struck~~ after");
    assert.deepEqual(runs, [
      { text: "before " },
      { text: "struck", strikethrough: true },
      { text: " after" },
    ]);
  });

  it("underline", () => {
    const runs = parseInlineRuns("before ++underlined++ after");
    assert.deepEqual(runs, [
      { text: "before " },
      { text: "underlined", underline: true },
      { text: " after" },
    ]);
  });

  it("strikethrough and bold combined", () => {
    const runs = parseInlineRuns("~~**both**~~");
    assert.deepEqual(runs, [
      { text: "both", bold: true, strikethrough: true },
    ]);
  });
});
