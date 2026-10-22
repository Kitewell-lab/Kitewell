import test from "node:test";
import assert from "node:assert/strict";

import { checkManageDataEntry, validateManageDataEntry, isValidManageDataEntry } from "./manageDataEntryValidate.js";

test("accepts valid manageData entry with Buffer value", () => {
  const buf = Buffer.from("hello world");
  const entry = { name: "config_key", value: buf };

  assert.equal(isValidManageDataEntry(entry), true);

  const res = checkManageDataEntry(entry);
  assert.equal(res.ok, true);
  assert.equal(res.name, "config_key");
  assert.equal(res.hasValue, true);
  assert.equal(res.isDelete, false);
  assert.equal(res.valueByteLength, 11);
});

test("accepts valid manageData entry with base64 string value", () => {
  // 'aGVsbG8=' decodes to 'hello' (5 bytes)
  const entry = { name: "user_alias", value: "aGVsbG8=" };
  const res = validateManageDataEntry(entry, { encoding: "base64" });
  assert.equal(res.ok, true);
  assert.equal(res.valueByteLength, 5);
});
