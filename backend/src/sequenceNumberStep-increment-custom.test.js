import test from "node:test";
import assert from "node:assert/strict";

import { incrementSequence } from "./sequenceNumberStep.js";

test("increments sequence by custom numeric delta", () => {
  assert.equal(incrementSequence("100", 5), "105");
});

test("increments sequence by custom BigInt or string delta", () => {
  assert.equal(incrementSequence("1000", 250n), "1250");
  assert.equal(incrementSequence("500", "500"), "1000");
});
