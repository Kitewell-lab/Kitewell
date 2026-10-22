import test from "node:test";
import assert from "node:assert/strict";

import { suggestSurgeMultiplier } from "./surgeMultiplierSuggest.js";

test("respects explicit priority tiers", () => {
  const stats = { last_ledger_base_fee: 100 };

  assert.equal(suggestSurgeMultiplier(stats, { priority: "standard" }).multiplier, 1.0);
  assert.equal(suggestSurgeMultiplier(stats, { priority: "priority" }).multiplier, 1.5);
  assert.equal(suggestSurgeMultiplier(stats, { priority: "high" }).multiplier, 2.0);
  assert.equal(suggestSurgeMultiplier(stats, { priority: "urgent" }).multiplier, 2.5);
  assert.equal(suggestSurgeMultiplier(stats, { priority: "critical" }).multiplier, 3.0);
});

test("handles case-insensitive priority names", () => {
  const stats = { last_ledger_base_fee: 100 };
  assert.equal(suggestSurgeMultiplier(stats, { priority: "URGENT" }).multiplier, 2.5);
  assert.equal(suggestSurgeMultiplier(stats, { priority: "  Priority  " }).multiplier, 1.5);
});
