import test from "node:test";
import assert from "node:assert/strict";

import { assertValidXdrBase64 } from "./xdrBase64ShapeValidate.js";

test("returns trimmed valid base64 string", () => {
  const result = assertValidXdrBase64("  AAAAAA==  ");
  assert.equal(result, "AAAAAA==");
});

test("throws TypeError when value is not a string", () => {
  assert.throws(() => assertValidXdrBase64(null), TypeError);
  assert.throws(() => assertValidXdrBase64(1234), TypeError);
});

test("throws RangeError on invalid shape or length", () => {
  assert.throws(() => assertValidXdrBase64(""), RangeError);
  assert.throws(() => assertValidXdrBase64("ABC"), RangeError);
  assert.throws(() => assertValidXdrBase64("AAA-"), RangeError);
});
