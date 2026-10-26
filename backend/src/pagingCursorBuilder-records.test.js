import test from "node:test";
import assert from "node:assert/strict";

import { buildPagingParams } from "./pagingCursorBuilder.js";

test("returns null cursor if last record contains no recognized paging token", () => {
  const records = [{ id: "1" }, { id: "2", other: "data" }];
  const res = buildPagingParams(records);
  assert.equal(res.cursor, null);
});

test("throws TypeError when last record in non-empty array is not an object", () => {
  assert.throws(() => buildPagingParams(["not-an-object"]), TypeError);
  assert.throws(() => buildPagingParams([null]), TypeError);
});
