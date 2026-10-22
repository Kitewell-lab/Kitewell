import test from "node:test";
import assert from "node:assert/strict";

import { parseAccountFlags } from "./accountFlagsParse.js";

test("preserves lower flags when higher unassigned bits are set", () => {
  // 17 = 16 (0x10) + 1 (authRequired)
  const flags = parseAccountFlags(17);
  assert.equal(flags.authRequired, true);
  assert.equal(flags.authRevocable, false);
  assert.equal(flags.authImmutable, false);
  assert.equal(flags.authClawbackEnabled, false);
  assert.equal(flags.raw, 17);
});

test("accurately records raw number when only high bits are set", () => {
  const flags = parseAccountFlags(32);
  assert.equal(flags.authRequired, false);
  assert.equal(flags.raw, 32);
});
