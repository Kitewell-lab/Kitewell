import test from "node:test";
import assert from "node:assert/strict";

import { isValidHomeDomain, validateHomeDomain, InvalidHomeDomainError } from "./homeDomainValidate.js";

test("rejects leading or trailing hyphens in labels", () => {
  assert.equal(isValidHomeDomain("-example.com"), false);
  assert.equal(isValidHomeDomain("example-.com"), false);
  assert.equal(isValidHomeDomain("example.-com"), false);

  assert.throws(
    () => validateHomeDomain("-example.com"),
    InvalidHomeDomainError
  );
});

test("rejects leading, trailing, or consecutive dots", () => {
  assert.equal(isValidHomeDomain(".example.com"), false);
  assert.equal(isValidHomeDomain("example.com."), false);
  assert.equal(isValidHomeDomain("example..com"), false);

  assert.throws(
    () => validateHomeDomain("example..com"),
    InvalidHomeDomainError
  );
});
