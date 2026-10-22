import test from "node:test";
import assert from "node:assert/strict";

import { isValidXdrBase64 } from "./xdrBase64ShapeValidate.js";

test("rejects strings whose length is not a multiple of 4", () => {
  assert.equal(isValidXdrBase64("A"), false);
  assert.equal(isValidXdrBase64("AB"), false);
  assert.equal(isValidXdrBase64("ABC"), false);
  assert.equal(isValidXdrBase64("ABCDE"), false);
  assert.equal(isValidXdrBase64("AAAAA=="), false);
  assert.equal(isValidXdrBase64("AAAAAAA"), false);
});
