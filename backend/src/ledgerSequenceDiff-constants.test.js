import test from "node:test";
import assert from "node:assert/strict";

import {
  LEDGER_SEQUENCE_ARGUMENT,
  LEDGER_SEQUENCE_ERROR,
  LEDGER_SEQUENCE_SIGN,
} from "./ledgerSequenceDiffConstants.js";

test("LEDGER_SEQUENCE_ARGUMENT defines frozen position indicators", () => {
  assert.equal(LEDGER_SEQUENCE_ARGUMENT.FIRST, "first");
  assert.equal(LEDGER_SEQUENCE_ARGUMENT.SECOND, "second");
  assert.equal(LEDGER_SEQUENCE_ARGUMENT.NEITHER, null);
  assert.equal(Object.isFrozen(LEDGER_SEQUENCE_ARGUMENT), true);
});

test("LEDGER_SEQUENCE_SIGN defines frozen comparison signs", () => {
  assert.equal(LEDGER_SEQUENCE_SIGN.FIRST_NEWER, 1);
  assert.equal(LEDGER_SEQUENCE_SIGN.SECOND_NEWER, -1);
  assert.equal(LEDGER_SEQUENCE_SIGN.EQUAL, 0);
  assert.equal(Object.isFrozen(LEDGER_SEQUENCE_SIGN), true);
});

test("LEDGER_SEQUENCE_ERROR defines frozen error message fragments", () => {
  assert.equal(LEDGER_SEQUENCE_ERROR.REQUIRED, "is required");
  assert.equal(LEDGER_SEQUENCE_ERROR.EMPTY, "cannot be empty");
  assert.equal(LEDGER_SEQUENCE_ERROR.NEGATIVE, "cannot be negative");
  assert.equal(LEDGER_SEQUENCE_ERROR.INTEGER, "must be an integer");
  assert.equal(Object.isFrozen(LEDGER_SEQUENCE_ERROR), true);
});
