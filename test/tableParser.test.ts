import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSlotContent } from "../dist/markdown/blocks/registry.js";
import { AcceptType } from "../dist/markdown/types.js";

// The bespoke `parseGfmTable` regex parser is gone; a table region now flows
// through the real GFM parser via `parseSlotContent`, which returns the folded
// block plus its acceptType. These tests assert the SAME `TableFill` shape the
// old parser produced (headers/rows/cell runs), driven off the mdast path.

const cell = (text: string) => ({ runs: [{ text }] });

const ctx = {
  resolveAssetRef: () => {
    throw new Error("no asset resolver expected in table tests");
  },
  layoutName: "L",
  slideNo: 1,
  source: "body content",
  config: { layouts: [], assets: {}, template: "", rootDir: "" },
};
const parse = (text: string) => parseSlotContent(text, ctx);

describe("GFM table via parseSlotContent", () => {
  it("parses a simple GFM table", async () => {
    const input = `| Name | Price |
|------|-------|
| Widget | $10 |
| Gadget | $20 |`;
    const result = parse(input);
    assert.equal(result.acceptType, AcceptType.Table);
    assert.deepEqual((await result.fill()), {
      headers: [cell("Name"), cell("Price")],
      rows: [
        [cell("Widget"), cell("$10")],
        [cell("Gadget"), cell("$20")],
      ],
    });
  });

  it("handles tables without leading/trailing pipes (loose tables)", async () => {
    const input = `Name | Price
------|-------
Widget | $10`;
    const result = parse(input);
    assert.equal(result.acceptType, AcceptType.Table);
    assert.deepEqual((await result.fill()), {
      headers: [cell("Name"), cell("Price")],
      rows: [[cell("Widget"), cell("$10")]],
    });
  });

  it("trims whitespace from cells", async () => {
    const input = `|  Name  |  Price  |
|--------|---------|
|  Widget  |  $10  |`;
    const result = parse(input);
    assert.deepEqual((await result.fill()), {
      headers: [cell("Name"), cell("Price")],
      rows: [[cell("Widget"), cell("$10")]],
    });
  });

  it("preserves inline formatting inside cells", async () => {
    const input = `| Name | Note |
|------|------|
| **Widget** | ~~gone~~ |`;
    const result = parse(input);
    assert.deepEqual((await result.fill()), {
      headers: [cell("Name"), cell("Note")],
      rows: [[{ runs: [{ text: "Widget", bold: true }] }, { runs: [{ text: "gone", strikethrough: true }] }]],
    });
  });

  it("keeps an empty cell as a single empty run", async () => {
    const input = `| A | B |
|---|---|
|   | y |`;
    const result = parse(input);
    assert.deepEqual((await result.fill()), {
      headers: [cell("A"), cell("B")],
      rows: [[cell(""), cell("y")]],
    });
  });

  it("non-table text folds to prose (text), not a table", async () => {
    const result = parse("Just some text");
    assert.equal(result.acceptType, AcceptType.Text);
    assert.ok("paragraphs" in (await result.fill()));
  });

  it("a single pipe row (no delimiter) is prose, not a table", async () => {
    const result = parse("| A | B |");
    assert.equal(result.acceptType, AcceptType.Text);
    assert.ok("paragraphs" in (await result.fill()));
  });

  it("a header row with no delimiter row is prose, not a table", async () => {
    const result = parse(`| A | B |
| 1 | 2 |`);
    assert.equal(result.acceptType, AcceptType.Text);
    assert.ok("paragraphs" in (await result.fill()));
  });

  it("handles a headers-only table (no body rows)", async () => {
    const input = `| A | B |
|---|---|`;
    const result = parse(input);
    assert.deepEqual((await result.fill()), {
      headers: [cell("A"), cell("B")],
      rows: [],
    });
  });

  it("handles separator with colons (alignment markers)", async () => {
    const input = `| Left | Center | Right |
|:-----|:------:|------:|
| a    | b      | c     |`;
    const result = parse(input);
    assert.deepEqual((await result.fill()), {
      headers: [cell("Left"), cell("Center"), cell("Right")],
      rows: [[cell("a"), cell("b"), cell("c")]],
    });
  });

  it("handles many columns", async () => {
    const input = `| A | B | C | D | E |
|---|---|---|---|---|
| 1 | 2 | 3 | 4 | 5 |`;
    const result = parse(input);
    const table = (await result.fill()) as { headers: unknown[]; rows: unknown[][] };
    assert.equal(table.headers.length, 5);
    assert.equal(table.rows[0].length, 5);
  });

  // BEHAVIOR CHANGE: the old regex parser rejected a single-column table
  // (returned null → prose); real GFM parses `| A |` as a one-column table.
  it("parses a single-column table (was prose under the old parser)", async () => {
    const input = `| A |
|---|
| 1 |`;
    const result = parse(input);
    assert.equal(result.acceptType, AcceptType.Table);
    assert.deepEqual((await result.fill()), {
      headers: [cell("A")],
      rows: [[cell("1")]],
    });
  });

  // BEHAVIOR CHANGE: the old parser filtered blank lines and merged all pipe
  // rows into one table. In real GFM a blank line TERMINATES the table, so the
  // trailing rows become a separate paragraph — a table mixed with prose, which
  // is now a fail-fast error (a standalone kind must be the region's only node).
  it("a blank line terminates the table; trailing rows mixed in → error", async () => {
    const input = `| A | B |
|---|---|

| 1 | 2 |
| 3 | 4 |`;
    // The mixed-content fail-fast now surfaces from `fill` (compile), after the
    // synchronous acceptType hand-off, so it rejects rather than throwing.
    await assert.rejects(
      () => parse(input).fill(),
      (err: Error) => {
        assert.ok(/mixes a "table" block/.test(err.message), err.message);
        return true;
      },
    );
  });
});
