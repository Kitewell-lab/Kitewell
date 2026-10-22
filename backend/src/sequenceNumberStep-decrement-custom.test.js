import test from "node:test";
import assert from "node:assert/strict";

import { decrementSequence } from "./sequenceNumberStep.js";

test("decrements sequence by custom delta", () => {
  assert.equal(decrementSequence("100", 30), "70");
  assert.equal(decrementSequence("50", 50n), "0");
  assert.equal(decrementSequence("1000", "250"), "750");
});
