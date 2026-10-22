import test from "node:test";
import assert from "node:assert/strict";

import { isValidXdrBase64 } from "./xdrBase64ShapeValidate.js";

test("rejects strings containing characters outside the base64 alphabet", () => {
  assert.equal(isValidXdrBase64("AAAA!AAA"), false);
  assert.equal(isValidXdrBase64("AAAA-AAA"), false); // URL-safe dash is rejected
  assert.equal(isValidXdrBase64("AAAA_AAA"), false); // URL-safe underscore is rejected
  assert.equal(isValidXdrBase64("AAAA@AAA"), false);
  assert.equal(isValidXdrBase64("AAAA#AAA"), false);
});
