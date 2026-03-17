// Unit Utilities Tests

import * as assert from "node:assert";
import { describe, it } from "node:test";
import { inToPx } from "../src/utils/units.js";

describe("inToPx()", () => {
  it("converts inches to pixels at 96 DPI", () => {
    assert.strictEqual(inToPx(1), 96);
    assert.strictEqual(inToPx(0.5), 48);
  });
});
