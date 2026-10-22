import test from "node:test";
import assert from "node:assert/strict";

import { suggestSurgeMultiplier } from "./surgeMultiplierSuggest.js";

test("suggests 1.0x multiplier on low ledger capacity usage (< 0.5)", () => {
  const result = suggestSurgeMultiplier({
    ledger_capacity_usage: "0.25",
    last_ledger_base_fee: "100",
  });
  assert.equal(result.multiplier, 1.0);
  assert.equal(result.tier, "low");
  assert.equal(result.capacityUsage, 0.25);
  assert.equal(result.recommendedFee, 100);
});

test("suggests 1.5x multiplier on medium capacity usage (0.5 - 0.79)", () => {
  const result = suggestSurgeMultiplier({
    ledger_capacity_usage: 0.65,
    last_ledger_base_fee: 100,
  });
  assert.equal(result.multiplier, 1.5);
  assert.equal(result.tier, "medium");
  assert.equal(result.recommendedFee, 150);
});

test("suggests 2.0x multiplier on high capacity usage (0.8 - 0.94)", () => {
  const result = suggestSurgeMultiplier({
    ledger_capacity_usage: "0.85",
    last_ledger_base_fee: 100,
  });
  assert.equal(result.multiplier, 2.0);
  assert.equal(result.tier, "high");
  assert.equal(result.recommendedFee, 200);
});

test("suggests 2.5x multiplier on critical capacity usage (>= 0.95)", () => {
  const result = suggestSurgeMultiplier({
    ledger_capacity_usage: 0.98,
    last_ledger_base_fee: 100,
  });
  assert.equal(result.multiplier, 2.5);
  assert.equal(result.tier, "critical");
  assert.equal(result.recommendedFee, 250);
});
