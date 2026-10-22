import test from "node:test";
import assert from "node:assert/strict";

import { isValidHomeDomain, validateHomeDomain, InvalidHomeDomainError } from "./homeDomainValidate.js";

test("rejects domains with port numbers", () => {
  assert.equal(isValidHomeDomain("example.com:80"), false);
  assert.equal(isValidHomeDomain("stellar.org:443"), false);
  assert.equal(isValidHomeDomain("localhost:8080"), false);

  assert.throws(
    () => validateHomeDomain("example.com:8080"),
    (err) => {
      assert(err instanceof InvalidHomeDomainError);
      assert.match(err.message, /must not include a port number/);
      return true;
    }
  );
});
