import test from "node:test";
import assert from "node:assert/strict";
import { calculateFeeBumpFee } from "./feeBumpFeeCalc.js";

test("calculateFeeBumpFee rejects null, undefined, or missing innerOpCount", () => {
  assert.throws(() => calculateFeeBumpFee(null), TypeError);
  assert.throws(() => calculateFeeBumpFee(undefined), TypeError);
});

test("calculateFeeBumpFee rejects non-integer numbers and malformed strings", () => {
  assert.throws(() => calculateFeeBumpFee(1.5), TypeError);
  assert.throws(() => calculateFeeBumpFee("invalid"), TypeError);
  assert.throws(() => calculateFeeBumpFee(1, 10.5), TypeError);
  assert.throws(() => calculateFeeBumpFee(1, "100.5"), TypeError);
});

test("calculateFeeBumpFee rejects boolean or object parameters", () => {
  assert.throws(() => calculateFeeBumpFee(true), TypeError);
  assert.throws(() => calculateFeeBumpFee({}), TypeError);
});
