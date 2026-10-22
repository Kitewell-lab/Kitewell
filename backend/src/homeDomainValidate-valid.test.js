import test from "node:test";
import assert from "node:assert/strict";

import { isValidHomeDomain, validateHomeDomain } from "./homeDomainValidate.js";

test("accepts standard two-level domains", () => {
  assert.equal(isValidHomeDomain("example.com"), true);
  assert.equal(isValidHomeDomain("stellar.org"), true);
  assert.equal(validateHomeDomain("stellar.org"), "stellar.org");
});

test("accepts subdomains and hyphenated labels", () => {
  assert.equal(isValidHomeDomain("my-wallet.stellar.org"), true);
  assert.equal(isValidHomeDomain("api.test.co"), true);
});

test("accepts single label hostnames like localhost", () => {
  assert.equal(isValidHomeDomain("localhost"), true);
});
