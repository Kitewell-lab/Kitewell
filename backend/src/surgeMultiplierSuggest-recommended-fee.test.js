import test from "node:test";
import assert from "node:assert/strict";

import { suggestSurgeMultiplier } from "./surgeMultiplierSuggest.js";

test("computes recommendedFee from baseFee and multiplier accurately", () => {
  const stats = { ledger_capacity_usage: 0.6 }; // 1.5x
  const res = suggestSurgeMultiplier(stats, { baseFee: 200 });
  assert.equal(res.multiplier, 1.5);
  assert.equal(res.recommendedFee, 300);
});

test("falls back to default base fee 100 when base fee is missing", () => {
  const stats = { ledger_capacity_usage: 0.2 }; // 1.0x
  const res = suggestSurgeMultiplier(stats);
  assert.equal(res.recommendedFee, 100);
});
