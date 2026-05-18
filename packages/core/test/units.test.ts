// Unit Utilities Tests

import * as assert from "node:assert";
import { describe, it } from "node:test";
import { ptToPx, pxToIn } from "../src/utils/units.js";

describe("pxToIn()", () => {
  it("converts pixels to inches at 96 DPI", () => {
    assert.strictEqual(pxToIn(96), 1);
    assert.strictEqual(pxToIn(48), 0.5);
  });
});

describe("ptToPx()", () => {
  it("converts points to pixels at 96 DPI", () => {
    // 72 pt = 1 inch = 96 px
    assert.strictEqual(ptToPx(72), 96);
    assert.strictEqual(ptToPx(36), 48);
  });
});
