import test from "node:test";
import assert from "node:assert/strict";

import { isValidXdrBase64 } from "./xdrBase64ShapeValidate.js";

test("returns false on non-string inputs", () => {
  assert.equal(isValidXdrBase64(null), false);
  assert.equal(isValidXdrBase64(undefined), false);
  assert.equal(isValidXdrBase64(1234), false);
  assert.equal(isValidXdrBase64({}), false);
  assert.equal(isValidXdrBase64(["AAAA"]), false);
});
