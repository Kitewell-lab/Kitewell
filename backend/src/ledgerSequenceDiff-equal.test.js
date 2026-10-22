import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedgerDiff } from "./ledgerSequenceDiff.js";

test("handles identical sequence numbers with zero difference and null newer/older", () => {
  const result = calculateLedgerDiff(5000, 5000);
  assert.equal(result.difference, 0);
  assert.equal(result.differenceBigInt, 0n);
  assert.equal(result.newer, null);
  assert.equal(result.older, null);
  assert.equal(result.sign, 0);
  assert.equal(result.isEqual, true);
});
