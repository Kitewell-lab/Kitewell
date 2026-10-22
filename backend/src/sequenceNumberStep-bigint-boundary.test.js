import test from "node:test";
import assert from "node:assert/strict";

import { incrementSequence, decrementSequence } from "./sequenceNumberStep.js";

const INT64_MAX = "9223372036854775807";
const INT64_MAX_PLUS_ONE = "9223372036854775808";

test("increments past standard 63-bit int boundary without overflow", () => {
  assert.equal(incrementSequence(INT64_MAX, 1), INT64_MAX_PLUS_ONE);
});

test("decrements back from past 63-bit int boundary", () => {
  assert.equal(decrementSequence(INT64_MAX_PLUS_ONE, 1), INT64_MAX);
});
