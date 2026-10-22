import test from "node:test";
import assert from "node:assert/strict";

import { isValidHomeDomain, validateHomeDomain, InvalidHomeDomainError } from "./homeDomainValidate.js";

test("rejects null and undefined", () => {
  assert.equal(isValidHomeDomain(null), false);
  assert.equal(isValidHomeDomain(undefined), false);

  assert.throws(() => validateHomeDomain(null), InvalidHomeDomainError);
  assert.throws(() => validateHomeDomain(undefined), InvalidHomeDomainError);
});

test("rejects non-string types", () => {
  assert.equal(isValidHomeDomain(123), false);
  assert.equal(isValidHomeDomain({}), false);
  assert.equal(isValidHomeDomain(true), false);

  assert.throws(() => validateHomeDomain(123), InvalidHomeDomainError);
});

test("rejects empty string", () => {
  assert.equal(isValidHomeDomain(""), false);
  assert.throws(() => validateHomeDomain(""), InvalidHomeDomainError);
});
