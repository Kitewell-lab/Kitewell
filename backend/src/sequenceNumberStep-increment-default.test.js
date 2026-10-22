import test from "node:test";
import assert from "node:assert/strict";

import { incrementSequence } from "./sequenceNumberStep.js";

test("increments a standard sequence string by default step 1", () => {
  assert.equal(incrementSequence("100"), "101");
  assert.equal(incrementSequence("0"), "1");
});

test("increments large 64-bit sequence string accurately", () => {
  const seq = "123456789012345678";
  assert.equal(incrementSequence(seq), "123456789012345679");
});
