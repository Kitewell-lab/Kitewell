import test from "node:test";
import assert from "node:assert/strict";

import { isValidHomeDomain, validateHomeDomain, InvalidHomeDomainError } from "./homeDomainValidate.js";

test("rejects domains with trailing slashes or path segments", () => {
  assert.equal(isValidHomeDomain("example.com/"), false);
  assert.equal(isValidHomeDomain("example.com/path"), false);
  assert.equal(isValidHomeDomain("stellar.org/sub/dir"), false);

  assert.throws(
    () => validateHomeDomain("example.com/path"),
    (err) => {
      assert(err instanceof InvalidHomeDomainError);
      assert.match(err.message, /must not include a path/);
      return true;
    }
  );
});
