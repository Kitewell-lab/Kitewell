import test from "node:test";
import assert from "node:assert/strict";

import { parseAccountFlags } from "./accountFlagsParse.js";

test("parses decimal string bitmask input", () => {
  const flags = parseAccountFlags("7");
  assert.equal(flags.authRequired, true);
  assert.equal(flags.authRevocable, true);
  assert.equal(flags.authImmutable, true);
  assert.equal(flags.authClawbackEnabled, false);
});

test("parses hex string bitmask input", () => {
  const flags = parseAccountFlags("0x8");
  assert.equal(flags.authClawbackEnabled, true);
});

test("parses BigInt bitmask input", () => {
  const flags = parseAccountFlags(15n);
  assert.equal(flags.authRequired, true);
  assert.equal(flags.authRevocable, true);
  assert.equal(flags.authImmutable, true);
  assert.equal(flags.authClawbackEnabled, true);
});
