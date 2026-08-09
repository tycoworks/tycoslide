import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseGfmTable } from "../dist/markdown/parsers.js";

const cell = (text: string) => ({ runs: [{ text }] });

describe("parseGfmTable", () => {
  it("parses a simple GFM table", () => {
    const input = `| Name | Price |
|------|-------|
| Widget | $10 |
| Gadget | $20 |`;
    const result = parseGfmTable(input);
    assert.deepEqual(result, {
      headers: [cell("Name"), cell("Price")],
      rows: [
        [cell("Widget"), cell("$10")],
        [cell("Gadget"), cell("$20")],
      ],
    });
  });

  it("handles tables without leading/trailing pipes", () => {
    const input = `Name | Price
------|-------
Widget | $10`;
    const result = parseGfmTable(input);
    assert.deepEqual(result, {
      headers: [cell("Name"), cell("Price")],
      rows: [[cell("Widget"), cell("$10")]],
    });
  });

  it("trims whitespace from cells", () => {
    const input = `|  Name  |  Price  |
|--------|---------|
|  Widget  |  $10  |`;
    const result = parseGfmTable(input);
    assert.deepEqual(result, {
      headers: [cell("Name"), cell("Price")],
      rows: [[cell("Widget"), cell("$10")]],
    });
  });

  it("returns null for non-table text", () => {
    assert.equal(parseGfmTable("Just some text"), null);
  });

  it("returns null for single line", () => {
    assert.equal(parseGfmTable("| A | B |"), null);
  });

  it("returns null when separator line is missing", () => {
    const input = `| A | B |
| 1 | 2 |`;
    assert.equal(parseGfmTable(input), null);
  });

  it("handles empty rows (headers only)", () => {
    const input = `| A | B |
|---|---|`;
    const result = parseGfmTable(input);
    assert.deepEqual(result, {
      headers: [cell("A"), cell("B")],
      rows: [],
    });
  });

  it("handles separator with colons (alignment markers)", () => {
    const input = `| Left | Center | Right |
|:-----|:------:|------:|
| a    | b      | c     |`;
    const result = parseGfmTable(input);
    assert.deepEqual(result, {
      headers: [cell("Left"), cell("Center"), cell("Right")],
      rows: [[cell("a"), cell("b"), cell("c")]],
    });
  });

  it("handles many columns", () => {
    const input = `| A | B | C | D | E |
|---|---|---|---|---|
| 1 | 2 | 3 | 4 | 5 |`;
    const result = parseGfmTable(input);
    assert.equal(result!.headers.length, 5);
    assert.equal(result!.rows[0].length, 5);
  });

  it("returns null for single-column table", () => {
    const input = `| A |
|---|
| 1 |`;
    assert.equal(parseGfmTable(input), null);
  });

  it("skips blank lines between rows", () => {
    const input = `| A | B |
|---|---|

| 1 | 2 |
| 3 | 4 |`;
    const result = parseGfmTable(input);
    assert.deepEqual(result, {
      headers: [cell("A"), cell("B")],
      rows: [
        [cell("1"), cell("2")],
        [cell("3"), cell("4")],
      ],
    });
  });
});
