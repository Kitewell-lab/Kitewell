import test from "node:test";
import assert from "node:assert/strict";

import {
  calcLiquidityPoolShare,
  checkLiquidityPoolShare,
  LiquidityPoolShareCalcError,
} from "./liquidityPoolShareCalc.js";

test("rejects null or undefined values", () => {
  assert.equal(checkLiquidityPoolShare(null, 100).code, "MISSING_VALUE");
  assert.equal(checkLiquidityPoolShare(100, undefined).code, "MISSING_VALUE");
});

test("rejects NaN and Infinity", () => {
  assert.equal(checkLiquidityPoolShare(NaN, 100).code, "NAN_VALUE");
  assert.equal(checkLiquidityPoolShare(10, Infinity).code, "INFINITE_VALUE");
});

test("rejects invalid numeric strings and empty strings", () => {
  assert.equal(checkLiquidityPoolShare("", 100).code, "EMPTY_STRING_VALUE");
  assert.equal(checkLiquidityPoolShare("abc", 100).code, "INVALID_NUMBER_STRING");
  assert.equal(checkLiquidityPoolShare("10.20.30", 100).code, "INVALID_NUMBER_STRING");
});

test("rejects invalid precision values", () => {
  assert.equal(checkLiquidityPoolShare(10, 100, { precision: -1 }).code, "INVALID_PRECISION");
  assert.equal(checkLiquidityPoolShare(10, 100, { precision: 2.5 }).code, "INVALID_PRECISION");
  assert.equal(checkLiquidityPoolShare(10, 100, { precision: 20 }).code, "INVALID_PRECISION");
});
