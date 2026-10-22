import test from "node:test";
import assert from "node:assert/strict";

import { checkManageDataEntry, validateManageDataEntry, InvalidManageDataEntryError } from "./manageDataEntryValidate.js";

test("rejects empty string name", () => {
  const res = checkManageDataEntry({ name: "", value: "abc" });
  assert.equal(res.ok, false);
  assert.equal(res.code, "EMPTY_NAME");

  assert.throws(
    () => validateManageDataEntry({ name: "", value: "abc" }),
    (err) => {
      assert(err instanceof InvalidManageDataEntryError);
      assert.equal(err.code, "EMPTY_NAME");
      return true;
    }
  );
});
