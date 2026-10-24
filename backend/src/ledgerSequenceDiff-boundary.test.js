import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedgerDiff } from "./ledgerSequenceDiff.js";

test("handles boundary difference of exactly one ledger", () => {
  const result = calculateLedgerDiff(1001, 1000);
  assert.equal(result.difference, 1);
  assert.equal(result.differenceBigInt, 1n);
  assert.equal(result.newer, "first");
});

test("handles very large ledger sequence BigInt inputs safely", () => {
  const bigA = 9_007_199_254_740_991n; // Number.MAX_SAFE_INTEGER
  const bigB = 9_007_199_254_740_900n;
  const result = calculateLedgerDiff(bigA, bigB);
  assert.equal(result.differenceBigInt, 91n);
  assert.equal(result.difference, 91);
});
