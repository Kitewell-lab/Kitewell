import test from "node:test";
import assert from "node:assert/strict";

import defaultValidate, {
  xdrBase64ShapeValidate,
  isValidXdrBase64,
} from "./xdrBase64ShapeValidate.js";

test("default and named exports are identical to isValidXdrBase64", () => {
  assert.equal(defaultValidate, isValidXdrBase64);
  assert.equal(xdrBase64ShapeValidate, isValidXdrBase64);
});
