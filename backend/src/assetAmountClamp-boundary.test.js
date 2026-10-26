import test from "node:test";
import assert from "node:assert/strict";

import { clampAssetAmount } from "./assetAmountClamp.js";

test("returns original string when amount exactly equals min bound", () => {
  assert.equal(clampAssetAmount("10.0", "10.0", "20.0"), "10.0");
});

test("returns original string when amount exactly equals max bound", () => {
  assert.equal(clampAssetAmount("20.0", "10.0", "20.0"), "20.0");
});

test("returns value when min and max are equal", () => {
  assert.equal(clampAssetAmount("5.0", "10.0", "10.0"), "10.0");
  assert.equal(clampAssetAmount("15.0", "10.0", "10.0"), "10.0");
  assert.equal(clampAssetAmount("10.0", "10.0", "10.0"), "10.0");
});
