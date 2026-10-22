import test from "node:test";
import assert from "node:assert/strict";

import { parseTrustlineFlags, isValidTrustlineFlags, InvalidTrustlineFlagsError } from "./trustlineFlagsParse.js";

test("rejects negative numeric values", () => {
  assert.equal(isValidTrustlineFlags(-1), false);
  assert.throws(
    () => parseTrustlineFlags(-1),
    (err) => {
      assert(err instanceof InvalidTrustlineFlagsError);
      assert.match(err.message, /cannot be negative/);
      return true;
    }
  );
});

test("rejects negative BigInt values", () => {
  assert.equal(isValidTrustlineFlags(-4n), false);
  assert.throws(() => parseTrustlineFlags(-4n), InvalidTrustlineFlagsError);
});
