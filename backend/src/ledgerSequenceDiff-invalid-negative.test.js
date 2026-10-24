import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedgerDiff } from "./ledgerSequenceDiff.js";

test("rejects negative integer sequence numbers with RangeError", () => {
  assert.throws(() => calculateLedgerDiff(-1, 100), RangeError);
  assert.throws(() => calculateLedgerDiff(100, -5), RangeError);
  assert.throws(() => calculateLedgerDiff("-50", "100"), RangeError);
  assert.throws(() => calculateLedgerDiff(10n, -10n), RangeError);
});
