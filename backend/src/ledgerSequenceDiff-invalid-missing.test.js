import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedgerDiff } from "./ledgerSequenceDiff.js";

test("rejects missing, undefined, or null sequence inputs with TypeError", () => {
  assert.throws(() => calculateLedgerDiff(undefined, 100), TypeError);
  assert.throws(() => calculateLedgerDiff(100, null), TypeError);
  assert.throws(() => calculateLedgerDiff(), TypeError);
});
