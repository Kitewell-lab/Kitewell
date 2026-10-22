import test from "node:test";
import assert from "node:assert/strict";

import { parseTrustlineFlags, isValidTrustlineFlags, InvalidTrustlineFlagsError } from "./trustlineFlagsParse.js";

test("rejects null and undefined", () => {
  assert.equal(isValidTrustlineFlags(null), false);
  assert.equal(isValidTrustlineFlags(undefined), false);

  assert.throws(() => parseTrustlineFlags(null), InvalidTrustlineFlagsError);
  assert.throws(() => parseTrustlineFlags(undefined), InvalidTrustlineFlagsError);
});

test("rejects non-integer floating point numbers", () => {
  assert.equal(isValidTrustlineFlags(2.5), false);
  assert.throws(() => parseTrustlineFlags(2.5), InvalidTrustlineFlagsError);
});

test("rejects malformed string inputs", () => {
  assert.equal(isValidTrustlineFlags("invalid"), false);
  assert.equal(isValidTrustlineFlags(""), false);
  assert.throws(() => parseTrustlineFlags("invalid"), InvalidTrustlineFlagsError);
  assert.throws(() => parseTrustlineFlags(""), InvalidTrustlineFlagsError);
});
