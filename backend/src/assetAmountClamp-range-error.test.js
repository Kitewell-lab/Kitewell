import test from "node:test";
import assert from "node:assert/strict";

import { clampAssetAmount } from "./assetAmountClamp.js";

test("throws RangeError when min exceeds max", () => {
  assert.throws(
    () => clampAssetAmount("50.0", "100.0", "10.0"),
    RangeError,
  );
  assert.throws(
    () => clampAssetAmount("50.0", { min: "100.0", max: "10.0" }),
    RangeError,
  );
});

test("throws RangeError when decimal exceeds 7 decimal places", () => {
  assert.throws(
    () => clampAssetAmount("1.12345678", "0.0", "10.0"),
    RangeError,
  );
  assert.throws(
    () => clampAssetAmount("1.0", "0.12345678", "10.0"),
    RangeError,
  );
  assert.throws(
    () => clampAssetAmount("1.0", "0.0", "10.12345678"),
    RangeError,
  );
});

test("throws RangeError on negative amounts", () => {
  assert.throws(
    () => clampAssetAmount("-5.0", "0.0", "10.0"),
    RangeError,
  );
});
