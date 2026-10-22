import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold, MAX_THRESHOLD } from "./multisigThresholdCheck.js";

test("handles exact match boundary (totalWeight === threshold)", () => {
  const res = checkMultisigThreshold([50, 50], 100);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, true);
  assert.equal(res.deficit, 0);
  assert.equal(res.excess, 0);
});

test("handles boundary off-by-one below (deficit = 1)", () => {
  const res = checkMultisigThreshold([99], 100);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, false);
  assert.equal(res.deficit, 1);
  assert.equal(res.excess, 0);
});

test("handles boundary off-by-one above (excess = 1)", () => {
  const res = checkMultisigThreshold([101], 100);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, true);
  assert.equal(res.deficit, 0);
  assert.equal(res.excess, 1);
});

test("handles maximum threshold 255", () => {
  const res = checkMultisigThreshold([255], MAX_THRESHOLD);
  assert.equal(res.ok, true);
  assert.equal(res.satisfied, true);
  assert.equal(res.totalWeight, 255);
});
