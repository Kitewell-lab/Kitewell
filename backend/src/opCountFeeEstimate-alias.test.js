import test from "node:test";
import assert from "node:assert/strict";

import defaultEstimate, {
  opCountFeeEstimate,
  estimateOpCountFee,
} from "./opCountFeeEstimate.js";

test("default export and named alias are identical to estimateOpCountFee", () => {
  assert.equal(defaultEstimate, estimateOpCountFee);
  assert.equal(opCountFeeEstimate, estimateOpCountFee);
});
