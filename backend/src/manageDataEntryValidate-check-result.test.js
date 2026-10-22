import test from "node:test";
import assert from "node:assert/strict";

import {
  checkManageDataEntry,
  validateManageDataEntry,
  assertManageDataEntry,
  InvalidManageDataEntryError,
} from "./manageDataEntryValidate.js";

test("checkManageDataEntry returns structured typed result on success", () => {
  const result = checkManageDataEntry({ name: "app_id", value: "stellar_123" });
  assert.equal(result.ok, true);
  assert.equal(result.name, "app_id");
  assert.equal(result.nameByteLength, 6);
  assert.equal(result.hasValue, true);
  assert.equal(result.isDelete, false);
  assert.equal(result.valueByteLength, 11);
});

test("checkManageDataEntry returns structured typed result on failure", () => {
  const result = checkManageDataEntry({ name: 12345, value: null });
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_NAME_TYPE");
  assert.ok(typeof result.error === "string");
  assert.ok(result.details !== undefined);
});

test("assertManageDataEntry succeeds for valid entry and throws InvalidManageDataEntryError on failure", () => {
  assert.doesNotThrow(() => {
    assertManageDataEntry({ name: "my_data", value: "ok" });
  });

  assert.throws(
    () => {
      assertManageDataEntry({ name: "", value: "ok" });
    },
    (err) => {
      assert.ok(err instanceof InvalidManageDataEntryError);
      assert.equal(err.code, "EMPTY_NAME");
      return true;
    }
  );
});
