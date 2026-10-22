import test from "node:test";
import assert from "node:assert/strict";

import { isValidHomeDomain, validateHomeDomain, InvalidHomeDomainError } from "./homeDomainValidate.js";

test("rejects non-ASCII Unicode characters", () => {
  assert.equal(isValidHomeDomain("例子.com"), false);
  assert.equal(isValidHomeDomain("stellar🌟.org"), false);
  assert.equal(isValidHomeDomain("café.com"), false);

  assert.throws(
    () => validateHomeDomain("例子.com"),
    (err) => {
      assert(err instanceof InvalidHomeDomainError);
      assert.match(err.message, /non-ASCII/);
      return true;
    }
  );
});
