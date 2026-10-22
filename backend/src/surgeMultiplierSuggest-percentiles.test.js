import test from "node:test";
import assert from "node:assert/strict";

import { suggestSurgeMultiplier } from "./surgeMultiplierSuggest.js";

test("infers multiplier from p90 fee when capacity usage is omitted", () => {
  // p90 = 100, base = 100 -> ratio 1.0 -> 1.0x
  const resLow = suggestSurgeMultiplier({
    fee_charged: { p90: "100" },
    last_ledger_base_fee: "100",
  });
  assert.equal(resLow.multiplier, 1.0);
  assert.equal(resLow.tier, "low");

  // p90 = 150, base = 100 -> ratio 1.5 -> 1.5x
  const resMed = suggestSurgeMultiplier({
    fee_charged: { p90: "150" },
    last_ledger_base_fee: "100",
  });
  assert.equal(resMed.multiplier, 1.5);
  assert.equal(resMed.tier, "medium");

  // p90 = 250, base = 100 -> ratio 2.5 -> 2.0x
  const resHigh = suggestSurgeMultiplier({
    fee_charged: { p90: 250 },
    last_ledger_base_fee: 100,
  });
  assert.equal(resHigh.multiplier, 2.0);
  assert.equal(resHigh.tier, "high");
});
