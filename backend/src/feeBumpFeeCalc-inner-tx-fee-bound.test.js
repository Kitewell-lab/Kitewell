import test from "node:test";
import assert from "node:assert/strict";
import { calculateFeeBumpFee } from "./feeBumpFeeCalc.js";

test("calculateFeeBumpFee clamps to innerTxFee when base calculation is lower", () => {
  // Calculated: (1 + 1) * 100 = 200n
  // innerTxFee: 500n
  // Expected: clamped to 500n
  const fee = calculateFeeBumpFee(1, 100, { innerTxFee: 500 });
  assert.equal(fee, 500n);
});

test("calculateFeeBumpFee does not reduce fee when base calculation exceeds innerTxFee", () => {
  // Calculated: (2 + 1) * 1000 = 3000n
  // innerTxFee: 500n
  // Expected: 3000n
  const fee = calculateFeeBumpFee(2, 1000, { innerTxFee: 500 });
  assert.equal(fee, 3000n);
});
