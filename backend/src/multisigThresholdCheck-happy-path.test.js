import test from "node:test";
import assert from "node:assert/strict";

import {
  checkMultisigThreshold,
  isMultisigThresholdSatisfied,
  assertMultisigThresholdSatisfied,
} from "./multisigThresholdCheck.js";

test("satisfies 2-of-3 multisig when threshold is met", () => {
  const weights = [1, 1, 0]; // 2 signers participated out of 3
  const threshold = 2;

  const res = checkMultisigThreshold(weights, threshold);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, true);
  assert.equal(res.totalWeight, 2);
  assert.equal(res.deficit, 0);
  assert.equal(res.excess, 0);

  assert.equal(isMultisigThresholdSatisfied(weights, threshold), true);
  assert.doesNotThrow(() => assertMultisigThresholdSatisfied(weights, threshold));
});

test("identifies deficit when weights sum is below threshold", () => {
  const weights = [1];
  const threshold = 2;

  const res = checkMultisigThreshold(weights, threshold);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, false);
  assert.equal(res.totalWeight, 1);
  assert.equal(res.deficit, 1);
  assert.equal(res.excess, 0);

  assert.equal(isMultisigThresholdSatisfied(weights, threshold), false);
});
