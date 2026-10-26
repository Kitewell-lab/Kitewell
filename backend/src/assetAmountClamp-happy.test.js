import test from "node:test";
import assert from "node:assert/strict";

import { clampAssetAmount } from "./assetAmountClamp.js";

test("returns amount unchanged when within [min, max] range", () => {
  assert.equal(clampAssetAmount("50.0", "10.0", "100.0"), "50.0");
  assert.equal(clampAssetAmount("25.1234567", "5.0", "30.0"), "25.1234567");
});

test("returns min when amount is below lower bound", () => {
  assert.equal(clampAssetAmount("5.0", "10.0", "100.0"), "10.0");
  assert.equal(clampAssetAmount("0", "0.0000001", "10.0"), "0.0000001");
});

test("returns max when amount is above upper bound", () => {
  assert.equal(clampAssetAmount("150.0", "10.0", "100.0"), "100.0");
  assert.equal(clampAssetAmount("999999", "1", "500"), "500");
});
