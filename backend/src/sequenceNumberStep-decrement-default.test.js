import test from "node:test";
import assert from "node:assert/strict";

import { decrementSequence } from "./sequenceNumberStep.js";

test("decrements standard sequence string by default step 1", () => {
  assert.equal(decrementSequence("100"), "99");
  assert.equal(decrementSequence("1"), "0");
});

test("decrements large sequence string accurately without precision loss", () => {
  const seq = "500000000000000000";
  assert.equal(decrementSequence(seq), "499999999999999999");
});
