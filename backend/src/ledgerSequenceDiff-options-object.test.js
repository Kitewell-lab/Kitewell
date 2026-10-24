import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedgerDiff, ledgerSequenceDiff } from "./ledgerSequenceDiff.js";

test("accepts options object with first and second properties", () => {
  const result = calculateLedgerDiff({ first: 200, second: 150 });
  assert.equal(result.difference, 50);
  assert.equal(result.newer, "first");

  const resultAlias = ledgerSequenceDiff({ current: "300", previous: "200" });
  assert.equal(resultAlias.difference, 100);
  assert.equal(resultAlias.newer, "first");
});
