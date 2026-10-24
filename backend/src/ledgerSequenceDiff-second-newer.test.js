import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedgerDiff } from "./ledgerSequenceDiff.js";

test("identifies when second sequence is newer and calculates non-negative difference", () => {
  const result = calculateLedgerDiff(1000, 1050);
  assert.equal(result.difference, 50);
  assert.equal(result.differenceBigInt, 50n);
  assert.equal(result.newer, "second");
  assert.equal(result.older, "first");
  assert.equal(result.sign, -1);
  assert.equal(result.isEqual, false);
});
