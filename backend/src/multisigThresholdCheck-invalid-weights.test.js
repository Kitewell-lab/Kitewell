import test from "node:test";
import assert from "node:assert/strict";

import { checkMultisigThreshold } from "./multisigThresholdCheck.js";

test("rejects negative weight values", () => {
  const res = checkMultisigThreshold([-1, 10], 5);
  assert.equal(res.ok, false);
  assert.equal(res.code, "WEIGHT_OUT_OF_RANGE");
});

test("rejects fractional/float weight values", () => {
  const res = checkMultisigThreshold([1.5], 1);
  assert.equal(res.ok, false);
  assert.equal(res.code, "NON_INTEGER_WEIGHT");
});

test("rejects weight exceeding 255", () => {
  const res = checkMultisigThreshold([256], 10);
  assert.equal(res.ok, false);
  assert.equal(res.code, "WEIGHT_OUT_OF_RANGE");
});

test("rejects objects missing weight property", () => {
  const res = checkMultisigThreshold([{ name: "alice" }], 10);
  assert.equal(res.ok, false);
  assert.equal(res.code, "INVALID_SIGNER_OBJECT");
});
