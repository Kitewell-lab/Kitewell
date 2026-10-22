import test from "node:test";
import assert from "node:assert/strict";

import { clampAssetAmount } from "./assetAmountClamp.js";

test("throws TypeError when amount is null or undefined", () => {
  assert.throws(() => clampAssetAmount(null, "1.0", "10.0"), TypeError);
  assert.throws(() => clampAssetAmount(undefined, "1.0", "10.0"), TypeError);
});

test("throws TypeError when amount is empty string or whitespace", () => {
  assert.throws(() => clampAssetAmount("", "1.0", "10.0"), TypeError);
  assert.throws(() => clampAssetAmount("   ", "1.0", "10.0"), TypeError);
});

test("throws RangeError when amount contains invalid characters", () => {
  assert.throws(() => clampAssetAmount("abc", "1.0", "10.0"), RangeError);
  assert.throws(() => clampAssetAmount("1.2.3", "1.0", "10.0"), RangeError);
});
