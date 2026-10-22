import test from "node:test";
import assert from "node:assert/strict";

import { isValidXdrBase64 } from "./xdrBase64ShapeValidate.js";

test("rejects empty or whitespace-only string by default", () => {
  assert.equal(isValidXdrBase64(""), false);
  assert.equal(isValidXdrBase64("   "), false);
});

test("accepts empty string when allowEmpty option is true", () => {
  assert.equal(isValidXdrBase64("", { allowEmpty: true }), true);
  assert.equal(isValidXdrBase64("   ", { allowEmpty: true }), true);
});
