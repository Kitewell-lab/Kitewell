import test from "node:test";
import assert from "node:assert/strict";

import { checkManageDataEntry, validateManageDataEntry, InvalidManageDataEntryError } from "./manageDataEntryValidate.js";

test("accepts Buffer value of exactly 64 bytes", () => {
  const buf64 = Buffer.alloc(64, 0xaa);
  const res = validateManageDataEntry({ name: "key", value: buf64 });
  assert.equal(res.ok, true);
  assert.equal(res.valueByteLength, 64);
});

test("rejects Buffer value of 65 bytes", () => {
  const buf65 = Buffer.alloc(65, 0xbb);
  const res = checkManageDataEntry({ name: "key", value: buf65 });
  assert.equal(res.ok, false);
  assert.equal(res.code, "VALUE_TOO_LONG");

  assert.throws(
    () => validateManageDataEntry({ name: "key", value: buf65 }),
    InvalidManageDataEntryError
  );
});
