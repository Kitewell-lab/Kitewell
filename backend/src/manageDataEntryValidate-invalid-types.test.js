import test from "node:test";
import assert from "node:assert/strict";

import { checkManageDataEntry, validateManageDataEntry, InvalidManageDataEntryError } from "./manageDataEntryValidate.js";

test("rejects null or non-object entry", () => {
  assert.equal(checkManageDataEntry(null).ok, false);
  assert.equal(checkManageDataEntry("not-an-object").ok, false);
  assert.throws(() => validateManageDataEntry(null), InvalidManageDataEntryError);
});

test("rejects non-string name property", () => {
  assert.equal(checkManageDataEntry({ name: 12345, value: null }).ok, false);
  assert.equal(checkManageDataEntry({ name: {}, value: null }).ok, false);
});

test("rejects unsupported value types like numbers or objects", () => {
  assert.equal(checkManageDataEntry({ name: "key", value: 12345 }).ok, false);
  assert.equal(checkManageDataEntry({ name: "key", value: {} }).ok, false);
});
