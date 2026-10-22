import test from "node:test";
import assert from "node:assert/strict";

import { parseAccountFlags, isValidAccountFlags, InvalidAccountFlagsError } from "./accountFlagsParse.js";

test("rejects null and undefined", () => {
  assert.equal(isValidAccountFlags(null), false);
  assert.equal(isValidAccountFlags(undefined), false);

  assert.throws(() => parseAccountFlags(null), InvalidAccountFlagsError);
  assert.throws(() => parseAccountFlags(undefined), InvalidAccountFlagsError);
});

test("rejects non-integer floating point numbers", () => {
  assert.equal(isValidAccountFlags(1.5), false);
  assert.throws(() => parseAccountFlags(1.5), InvalidAccountFlagsError);
});

test("rejects malformed string inputs", () => {
  assert.equal(isValidAccountFlags("abc"), false);
  assert.equal(isValidAccountFlags(""), false);
  assert.throws(() => parseAccountFlags("abc"), InvalidAccountFlagsError);
  assert.throws(() => parseAccountFlags(""), InvalidAccountFlagsError);
});
