import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";

test("rejects negative threshold", () => {
  const res = checkMultisigThreshold([10], -1);
  assert.equal(res.ok, false);
  assert.equal(res.code, "THRESHOLD_OUT_OF_RANGE");
});

test("rejects threshold exceeding 255", () => {
  const res = checkMultisigThreshold([10], 256);
  assert.equal(res.ok, false);
  assert.equal(res.code, "THRESHOLD_OUT_OF_RANGE");
});

test("rejects fractional/float threshold", () => {
  const res = checkMultisigThreshold([10], 1.5);
  assert.equal(res.ok, false);
  assert.equal(res.code, "NON_INTEGER_THRESHOLD");
});

test("rejects non-numeric threshold", () => {
  assert.equal(checkMultisigThreshold([10], null).ok, false);
  assert.equal(checkMultisigThreshold([10], "10").ok, false);
  assert.equal(checkMultisigThreshold([10], NaN).ok, false);
});
