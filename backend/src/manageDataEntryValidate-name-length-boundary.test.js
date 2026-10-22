import test from "node:test";
import assert from "node:assert/strict";

import { checkManageDataEntry, validateManageDataEntry, InvalidManageDataEntryError } from "./manageDataEntryValidate.js";

test("accepts name of exactly 64 ASCII bytes", () => {
  const name64 = "a".repeat(64);
  const res = validateManageDataEntry({ name: name64, value: null });
  assert.equal(res.ok, true);
  assert.equal(res.nameByteLength, 64);
});

test("rejects name exceeding 64 bytes by 1 byte", () => {
  const name65 = "a".repeat(65);
  const res = checkManageDataEntry({ name: name65, value: null });
  assert.equal(res.ok, false);
  assert.equal(res.code, "NAME_TOO_LONG");

  assert.throws(
    () => validateManageDataEntry({ name: name65, value: null }),
    InvalidManageDataEntryError
  );
});
