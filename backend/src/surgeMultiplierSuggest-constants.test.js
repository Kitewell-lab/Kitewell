import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_BASE_FEE,
  MIN_SURGE_MULTIPLIER,
  MAX_SURGE_MULTIPLIER,
  SURGE_TIERS,
} from "./surgeMultiplierSuggest.js";

test("exports standard fee constants and surge tiers", () => {
  assert.equal(DEFAULT_BASE_FEE, 100);
  assert.equal(MIN_SURGE_MULTIPLIER, 1.0);
  assert.equal(MAX_SURGE_MULTIPLIER, 10.0);
  assert.equal(SURGE_TIERS.standard, 1.0);
  assert.equal(SURGE_TIERS.priority, 1.5);
  assert.equal(SURGE_TIERS.high, 2.0);
  assert.equal(SURGE_TIERS.urgent, 2.5);
});
