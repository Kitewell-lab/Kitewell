import test from "node:test";
import assert from "node:assert/strict";

import { incrementSequence, isValidSequenceNumber, InvalidSequenceNumberError } from "./sequenceNumberStep.js";

test("rejects non-numeric characters and spaces", () => {
  assert.equal(isValidSequenceNumber("123a"), false);
  assert.equal(isValidSequenceNumber(" 123 "), false);
  assert.equal(isValidSequenceNumber(""), false);
  assert.equal(isValidSequenceNumber(null), false);
  assert.equal(isValidSequenceNumber(undefined), false);

  assert.throws(() => incrementSequence("123a"), InvalidSequenceNumberError);
  assert.throws(() => incrementSequence(" 123 "), InvalidSequenceNumberError);
  assert.throws(() => incrementSequence(""), InvalidSequenceNumberError);
  assert.throws(() => incrementSequence(null), InvalidSequenceNumberError);
});

test("rejects floating-point numbers", () => {
  assert.equal(isValidSequenceNumber(12.34), false);
  assert.throws(() => incrementSequence(12.34), InvalidSequenceNumberError);
});
