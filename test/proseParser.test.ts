import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSlotContent } from "../dist/markdown/blocks/registry.js";
import { AcceptType } from "../dist/markdown/types.js";

// The prose path folds paragraphs/lists/headings into one TextFill. Two
// behaviors carry over from the pre-mdast parser and are locked here: bullet
// levels now come from real `list`/`listItem` nesting (not `floor(indent/2)`),
// and "one source line = one StyledParagraph" — mdast collapses consecutive
// non-blank lines into a single `paragraph`, so the aggregate must re-split each
// paragraph's runs on soft line breaks.

const ctx = {
  resolveAssetRef: () => {
    throw new Error("no asset resolver expected in prose tests");
  },
  layoutName: "L",
  slideIdx: 0,
  source: "body content",
  config: { layouts: [], assets: {}, template: "", rootDir: "" },
};
const parse = (text: string) => parseSlotContent(text, ctx);
const textFill = async (text: string) => {
  const result = parse(text);
  assert.equal(result.acceptType, AcceptType.Text);
  return (await result.fill()) as { paragraphs: Array<{ runs: unknown[]; bullet?: { level: number } }> };
};

describe("prose via parseSlotContent", () => {
  it("bullet level comes from structural list nesting, not indentation width", async () => {
    const { paragraphs } = await textFill("- Top\n  - Nested\n    - Deeper");
    assert.deepEqual(paragraphs, [
      { runs: [{ text: "Top" }], bullet: { level: 0 } },
      { runs: [{ text: "Nested" }], bullet: { level: 1 } },
      { runs: [{ text: "Deeper" }], bullet: { level: 2 } },
    ]);
  });

  it("ordered lists become plain bullets (the engine has no ordered flag)", async () => {
    const { paragraphs } = await textFill("1. First\n2. Second");
    assert.deepEqual(paragraphs, [
      { runs: [{ text: "First" }], bullet: { level: 0 } },
      { runs: [{ text: "Second" }], bullet: { level: 0 } },
    ]);
  });

  it("prose before a list yields an unbulleted paragraph then bullets", async () => {
    const { paragraphs } = await textFill("Intro line\n\n- A\n- B");
    assert.deepEqual(paragraphs, [
      { runs: [{ text: "Intro line" }] },
      { runs: [{ text: "A" }], bullet: { level: 0 } },
      { runs: [{ text: "B" }], bullet: { level: 0 } },
    ]);
  });

  it("consecutive non-blank lines split into one StyledParagraph each", async () => {
    const { paragraphs } = await textFill("Line one\nLine two\nLine three");
    assert.deepEqual(paragraphs, [
      { runs: [{ text: "Line one" }] },
      { runs: [{ text: "Line two" }] },
      { runs: [{ text: "Line three" }] },
    ]);
  });

  it("inline formatting is preserved across a soft-break split", async () => {
    const { paragraphs } = await textFill("**bold** first\nplain second");
    assert.deepEqual(paragraphs, [
      { runs: [{ text: "bold", bold: true }, { text: " first" }] },
      { runs: [{ text: "plain second" }] },
    ]);
  });

  it("blank lines between paragraphs produce no empty StyledParagraph", async () => {
    const { paragraphs } = await textFill("First\n\n\nSecond");
    assert.deepEqual(paragraphs, [{ runs: [{ text: "First" }] }, { runs: [{ text: "Second" }] }]);
  });

  it("a markdown hard break (trailing two spaces) splits into two StyledParagraphs", async () => {
    const { paragraphs } = await textFill("a  \nb");
    assert.deepEqual(paragraphs, [{ runs: [{ text: "a" }] }, { runs: [{ text: "b" }] }]);
  });
});
