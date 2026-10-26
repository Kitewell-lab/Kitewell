import test from "node:test";
import assert from "node:assert/strict";

import { clampAssetAmount } from "./assetAmountClamp.js";

test("accepts options object with min and max properties", () => {
  const result = clampAssetAmount("5.5", { min: "10.0", max: "20.0" });
  assert.equal(result, "10.0");
});

test("supports open-ended range with only min specified", () => {
  assert.equal(clampAssetAmount("2.0", { min: "5.0" }), "5.0");
  assert.equal(clampAssetAmount("100.0", { min: "5.0" }), "100.0");
});

test("supports open-ended range with only max specified", () => {
  assert.equal(clampAssetAmount("50.0", { max: "20.0" }), "20.0");
  assert.equal(clampAssetAmount("15.0", { max: "20.0" }), "15.0");
});
