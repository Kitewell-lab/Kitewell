import test from "node:test";
import assert from "node:assert/strict";

import { estimateOpCountFee } from "./opCountFeeEstimate.js";

test("rejects null and undefined operation counts", () => {
  assert.throws(() => estimateOpCountFee(null), TypeError);
  assert.throws(() => estimateOpCountFee(undefined), TypeError);
});

test("rejects object and array operation counts", () => {
  assert.throws(() => estimateOpCountFee({}), TypeError);
  assert.throws(() => estimateOpCountFee([1]), TypeError);
});

test("rejects non-numeric string operation counts", () => {
  assert.throws(() => estimateOpCountFee("abc"), TypeError);
  assert.throws(() => estimateOpCountFee(""), TypeError);
});
