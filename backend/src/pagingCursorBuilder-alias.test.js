import test from "node:test";
import assert from "node:assert/strict";

import defaultBuilder, {
  pagingCursorBuilder,
  buildPagingParams,
} from "./pagingCursorBuilder.js";

test("default export and named alias are identical to buildPagingParams", () => {
  assert.equal(defaultBuilder, buildPagingParams);
  assert.equal(pagingCursorBuilder, buildPagingParams);
});
