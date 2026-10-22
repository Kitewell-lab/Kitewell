import test from "node:test";
import assert from "node:assert/strict";

import { checkManageDataEntry, validateManageDataEntry } from "./manageDataEntryValidate.js";

test("accurately computes multi-byte UTF-8 character byte lengths", () => {
  // '星' is 3 UTF-8 bytes. 21 * 3 = 63 bytes <= 64 bytes
  const name63 = "星".repeat(21);
  const res = validateManageDataEntry({ name: name63, value: null });
  assert.equal(res.ok, true);
  assert.equal(res.nameByteLength, 63);
});

test("rejects multi-byte UTF-8 name when total bytes exceed 64", () => {
  // 22 * 3 = 66 bytes > 64 bytes
  const name66 = "星".repeat(22);
  const res = checkManageDataEntry({ name: name66, value: null });
  assert.equal(res.ok, false);
  assert.equal(res.code, "NAME_TOO_LONG");
});
