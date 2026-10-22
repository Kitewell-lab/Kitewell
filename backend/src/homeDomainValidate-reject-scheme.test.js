import test from "node:test";
import assert from "node:assert/strict";

import { isValidHomeDomain, validateHomeDomain, InvalidHomeDomainError } from "./homeDomainValidate.js";

test("rejects domains with https:// or http:// scheme", () => {
  assert.equal(isValidHomeDomain("https://example.com"), false);
  assert.equal(isValidHomeDomain("http://stellar.org"), false);

  assert.throws(
    () => validateHomeDomain("https://example.com"),
    (err) => {
      assert(err instanceof InvalidHomeDomainError);
      assert.match(err.message, /must not include a URL scheme/);
      return true;
    }
  );
});

test("rejects other schemes like ftp or custom prefixes", () => {
  assert.equal(isValidHomeDomain("ftp://stellar.org"), false);
});
