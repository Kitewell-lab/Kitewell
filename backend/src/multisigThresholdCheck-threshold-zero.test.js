import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold, isMultisigThresholdSatisfied } from "./multisigThresholdCheck.js";

test("satisfies threshold 0 with empty weights array", () => {
  const res = checkMultisigThreshold([], 0);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, true);
  assert.equal(res.totalWeight, 0);
  assert.equal(res.deficit, 0);
  assert.equal(isMultisigThresholdSatisfied([], 0), true);
});

test("satisfies threshold 0 with non-zero weights array", () => {
  const res = checkMultisigThreshold([5, 10], 0);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, true);
  assert.equal(res.totalWeight, 15);
  assert.equal(res.excess, 15);
});
