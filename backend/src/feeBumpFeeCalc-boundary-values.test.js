import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFeeBumpFee,
  DEFAULT_BASE_FEE_STROOPS,
  STROOPS_PER_XLM,
} from "./feeBumpFeeCalc.js";

test("calculateFeeBumpFee rejects non-positive innerOpCount", () => {
  assert.throws(() => calculateFeeBumpFee(0), RangeError);
  assert.throws(() => calculateFeeBumpFee(-1), RangeError);
  assert.throws(() => calculateFeeBumpFee("-5"), RangeError);
});

test("calculateFeeBumpFee accepts boundary 0 perOpFee and resourceFee", () => {
  assert.equal(calculateFeeBumpFee(1, 0), 0n);
  assert.equal(calculateFeeBumpFee(1, 0, { resourceFee: 0 }), 0n);
});

test("calculateFeeBumpFee rejects negative fees", () => {
  assert.throws(() => calculateFeeBumpFee(1, -100), RangeError);
  assert.throws(() => calculateFeeBumpFee(1, 100, { resourceFee: -1 }), RangeError);
  assert.throws(() => calculateFeeBumpFee(1, 100, { innerTxFee: -1 }), RangeError);
});

test("exports expected network constants", () => {
  assert.equal(DEFAULT_BASE_FEE_STROOPS, 100n);
  assert.equal(STROOPS_PER_XLM, 10_000_000n);
});
