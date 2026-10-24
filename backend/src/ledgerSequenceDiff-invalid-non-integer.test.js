import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedgerDiff } from "./ledgerSequenceDiff.js";

test("rejects fractional or non-numeric sequence values with TypeError", () => {
  assert.throws(() => calculateLedgerDiff(12.34, 10), TypeError);
  assert.throws(() => calculateLedgerDiff(10, 5.67), TypeError);
  assert.throws(() => calculateLedgerDiff("invalid", 10), TypeError);
  assert.throws(() => calculateLedgerDiff(NaN, 10), TypeError);
  assert.throws(() => calculateLedgerDiff(Infinity, 10), TypeError);
});
