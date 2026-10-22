import test from "node:test";
import assert from "node:assert/strict";

import { checkManageDataEntry, validateManageDataEntry } from "./manageDataEntryValidate.js";

test("identifies null value as a delete operation", () => {
  const entry = { name: "deprecated_key", value: null };
  const res = validateManageDataEntry(entry);
  assert.equal(res.ok, true);
  assert.equal(res.isDelete, true);
  assert.equal(res.hasValue, false);
  assert.equal(res.valueByteLength, 0);
});

test("identifies undefined value as a delete operation", () => {
  const entry = { name: "another_key" };
  const res = checkManageDataEntry(entry);
  assert.equal(res.ok, true);
  assert.equal(res.isDelete, true);
});
