import test from "node:test";
import assert from "node:assert/strict";
import { calculateFeeBumpFee } from "./feeBumpFeeCalc.js";

test("calculateFeeBumpFee computes standard 1-operation inner tx with default base fee", () => {
  // innerOpCount = 1, effectiveOps = 2, baseFee = 100 stroops => 200n
  const fee = calculateFeeBumpFee(1);
  assert.equal(fee, 200n);
});

test("calculateFeeBumpFee supports numeric strings and BigInt inputs", () => {
  assert.equal(calculateFeeBumpFee("1", "100"), 200n);
  assert.equal(calculateFeeBumpFee(1n, 100n), 200n);
});
