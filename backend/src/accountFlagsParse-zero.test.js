import test from "node:test";
import assert from "node:assert/strict";

import { parseAccountFlags, isValidAccountFlags } from "./accountFlagsParse.js";

test("parses bitmask 0 as all flags disabled", () => {
  assert.equal(isValidAccountFlags(0), true);

  const parsed = parseAccountFlags(0);
  assert.deepEqual(parsed, {
    authRequired: false,
    authRevocable: false,
    authImmutable: false,
    authClawbackEnabled: false,
    raw: 0,
  });
});
