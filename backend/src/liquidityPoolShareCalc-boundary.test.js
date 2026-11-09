import test from "node:test";
import assert from "node:assert/strict";

import { calculatePoolSharePercentage } from "./liquidityPoolShareCalc.js";
import { LIQUIDITY_POOL_SHARE_ERROR } from "./liquidityPoolShareCalcConstants.js";

test("handles 0% and 100% pool share boundaries", () => {
  assert.equal(calculatePoolSharePercentage("0.0000000", "500.0000000"), "0.0000");
  assert.equal(calculatePoolSharePercentage(0n, 1n), "0.0000");
  assert.equal(
    calculatePoolSharePercentage("500.0000000", "500.0000000"),
    "100.0000",
  );
});

test("handles 1-stroop share balance against a 1-share pool", () => {
  assert.equal(
    calculatePoolSharePercentage("0.0000001", "1.0000000", { precision: 7 }),
    "0.0000100",
  );
});

test("rejects shareBalance greater than totalShares", () => {
  assert.throws(
    () => calculatePoolSharePercentage("100.0000001", "100.0000000"),
    {
      name: "RangeError",
      message: LIQUIDITY_POOL_SHARE_ERROR.EXCEEDS_TOTAL,
    },
  );
});
