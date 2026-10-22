import test from "node:test";
import assert from "node:assert/strict";

import { buildPagingParams } from "./pagingCursorBuilder.js";

test("supports asc and desc in lowercase and uppercase", () => {
  assert.equal(buildPagingParams([], { order: "asc" }).order, "asc");
  assert.equal(buildPagingParams([], { order: "desc" }).order, "desc");
  assert.equal(buildPagingParams([], { order: "ASC" }).order, "asc");
  assert.equal(buildPagingParams([], { order: "DESC" }).order, "desc");
});

test("throws TypeError on unsupported order values", () => {
  assert.throws(
    () => buildPagingParams([], { order: "invalid" }),
    TypeError,
  );
  assert.throws(
    () => buildPagingParams([], { order: 123 }),
    TypeError,
  );
});
