import test from "node:test";
import assert from "node:assert/strict";

import { calculatePoolSharePercentage } from "./liquidityPoolShareCalc.js";
import { LIQUIDITY_POOL_SHARE_ERROR } from "./liquidityPoolShareCalcConstants.js";

test("rejects non-numeric, floating-point, or unsafe number shareBalance values", () => {
  for (const invalid of [null, undefined, true, {}, [], 1.5, NaN, Infinity]) {
    assert.throws(() => calculatePoolSharePercentage(invalid, 100n), {
      name: "TypeError",
      message: LIQUIDITY_POOL_SHARE_ERROR.SHARE_TYPE,
    });
  }
});

test("rejects malformed or over-precision shareBalance strings", () => {
  for (const invalid of ["", "   ", "abc", "1.2.3", "1.12345678", "1e5"]) {
    assert.throws(() => calculatePoolSharePercentage(invalid, 100n), {
      name: "TypeError",
      message: LIQUIDITY_POOL_SHARE_ERROR.SHARE_FORMAT,
    });
  }
});

test("rejects negative shareBalance values", () => {
  for (const negative of [-1n, -5, "-0.0000001", "-10"]) {
    assert.throws(() => calculatePoolSharePercentage(negative, 100n), {
      name: "RangeError",
      message: LIQUIDITY_POOL_SHARE_ERROR.SHARE_NEGATIVE,
    });
  }
});
