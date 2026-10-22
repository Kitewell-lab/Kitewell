import test from "node:test";
import assert from "node:assert/strict";

import { parseAccountFlags, isValidAccountFlags, InvalidAccountFlagsError } from "./accountFlagsParse.js";

test("rejects negative numeric values", () => {
  assert.equal(isValidAccountFlags(-1), false);
  assert.throws(
    () => parseAccountFlags(-1),
    (err) => {
      assert(err instanceof InvalidAccountFlagsError);
      assert.match(err.message, /cannot be negative/);
      return true;
    }
  );
});

test("rejects negative BigInt values", () => {
  assert.equal(isValidAccountFlags(-8n), false);
  assert.throws(() => parseAccountFlags(-8n), InvalidAccountFlagsError);
});
