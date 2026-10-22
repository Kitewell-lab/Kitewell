import test from "node:test";
import assert from "node:assert/strict";

import { parseAccountFlags } from "./accountFlagsParse.js";

test("parses combined flags bitmask 3 (authRequired + authRevocable)", () => {
  const flags = parseAccountFlags(3);
  assert.equal(flags.authRequired, true);
  assert.equal(flags.authRevocable, true);
  assert.equal(flags.authImmutable, false);
  assert.equal(flags.authClawbackEnabled, false);
});

test("parses combined flags bitmask 15 (all 4 flags enabled)", () => {
  const flags = parseAccountFlags(15);
  assert.equal(flags.authRequired, true);
  assert.equal(flags.authRevocable, true);
  assert.equal(flags.authImmutable, true);
  assert.equal(flags.authClawbackEnabled, true);
});

test("parses combined flags bitmask 10 (authRevocable + authClawbackEnabled)", () => {
  const flags = parseAccountFlags(10);
  assert.equal(flags.authRequired, false);
  assert.equal(flags.authRevocable, true);
  assert.equal(flags.authImmutable, false);
  assert.equal(flags.authClawbackEnabled, true);
});
