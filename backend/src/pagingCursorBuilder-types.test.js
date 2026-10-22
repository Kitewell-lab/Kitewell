import test from "node:test";
import assert from "node:assert/strict";

import { buildPagingParams } from "./pagingCursorBuilder.js";

test("throws TypeError when records is not an array", () => {
  assert.throws(() => buildPagingParams(null), TypeError);
  assert.throws(() => buildPagingParams(undefined), TypeError);
  assert.throws(() => buildPagingParams("records"), TypeError);
  assert.throws(() => buildPagingParams(12345), TypeError);
  assert.throws(() => buildPagingParams({}), TypeError);
});
