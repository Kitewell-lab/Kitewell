import test from "node:test";
import assert from "node:assert/strict";

import { isValidXdrBase64 } from "./xdrBase64ShapeValidate.js";

test("rejects padding '=' occurring in the middle of a string", () => {
  assert.equal(isValidXdrBase64("AA==AAAA"), false);
  assert.equal(isValidXdrBase64("AAA=AAAA"), false);
});

test("rejects more than two padding '=' characters", () => {
  assert.equal(isValidXdrBase64("A==="), false);
  assert.equal(isValidXdrBase64("===="), false);
});
