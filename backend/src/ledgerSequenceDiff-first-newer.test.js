import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedgerDiff } from "./ledgerSequenceDiff.js";

test("identifies when first sequence is newer and calculates positive difference", () => {
  const result = calculateLedgerDiff(1050, 1000);
  assert.equal(result.difference, 50);
  assert.equal(result.differenceBigInt, 50n);
  assert.equal(result.newer, "first");
  assert.equal(result.older, "second");
  assert.equal(result.sign, 1);
  assert.equal(result.isEqual, false);
});
