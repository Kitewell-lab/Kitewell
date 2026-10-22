import test from "node:test";
import assert from "node:assert/strict";

import { isValidHomeDomain, validateHomeDomain, InvalidHomeDomainError } from "./homeDomainValidate.js";

test("accepts a domain exactly 32 bytes long", () => {
  // "a".repeat(28) + ".org" = 32 chars
  const domain32 = `${"a".repeat(28)}.org`;
  assert.equal(domain32.length, 32);
  assert.equal(isValidHomeDomain(domain32), true);
  assert.equal(validateHomeDomain(domain32), domain32);
});

test("rejects a domain exceeding 32 bytes by 1 byte", () => {
  const domain33 = `${"a".repeat(29)}.org`;
  assert.equal(domain33.length, 33);
  assert.equal(isValidHomeDomain(domain33), false);
  assert.throws(
    () => validateHomeDomain(domain33),
    (err) => {
      assert(err instanceof InvalidHomeDomainError);
      assert.match(err.message, /exceeds maximum length of 32 bytes/);
      return true;
    }
  );
});
