import test from "node:test";
import assert from "node:assert/strict";

import { suggestSurgeMultiplier } from "./surgeMultiplierSuggest.js";

test("clamps multiplier to custom minMultiplier", () => {
  const stats = { ledger_capacity_usage: 0.1, last_ledger_base_fee: 100 };
  const res = suggestSurgeMultiplier(stats, { minMultiplier: 1.25 });
  assert.equal(res.multiplier, 1.25);
  assert.equal(res.recommendedFee, 125);
});

test("clamps multiplier to custom maxMultiplier", () => {
  const stats = { ledger_capacity_usage: 0.99, last_ledger_base_fee: 100 };
  const res = suggestSurgeMultiplier(stats, { maxMultiplier: 1.8 });
  assert.equal(res.multiplier, 1.8);
  assert.equal(res.recommendedFee, 180);
});
