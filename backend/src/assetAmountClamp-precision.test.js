import test from "node:test";
import assert from "node:assert/strict";

import { clampAssetAmount } from "./assetAmountClamp.js";

test("differentiates amounts differing by 1 stroop (0.0000001)", () => {
  // Amount is 1 stroop below min
  assert.equal(
    clampAssetAmount("1.0000000", "1.0000001", "2.0000000"),
    "1.0000001",
  );

  // Amount is 1 stroop above max
  assert.equal(
    clampAssetAmount("2.0000001", "1.0000000", "2.0000000"),
    "2.0000000",
  );
});

test("handles trailing zeroes and padded decimals accurately", () => {
  // 1.5 is numerically equal to 1.5000000
  assert.equal(clampAssetAmount("1.5", "1.5000000", "2.0"), "1.5");
  assert.equal(clampAssetAmount("1.5000000", "1.5", "2.0"), "1.5000000");
});
