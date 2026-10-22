import test from "node:test";
import assert from "node:assert/strict";

import { stepSequenceNumber } from "./sequenceNumberStep.js";

test("steps sequence forward with positive integer", () => {
  assert.equal(stepSequenceNumber("100", 10), "110");
  assert.equal(stepSequenceNumber("100", "+15"), "115");
});

test("steps sequence backward with negative integer", () => {
  assert.equal(stepSequenceNumber("100", -10), "90");
  assert.equal(stepSequenceNumber("50", "-50"), "0");
});

test("steps sequence with zero produces identical sequence string", () => {
  assert.equal(stepSequenceNumber("12345", 0), "12345");
});
