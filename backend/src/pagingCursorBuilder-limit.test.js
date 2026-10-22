import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPagingParams,
  MIN_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from "./pagingCursorBuilder.js";

test("allows boundary limit values MIN_PAGE_LIMIT and MAX_PAGE_LIMIT", () => {
  const minResult = buildPagingParams([], { limit: MIN_PAGE_LIMIT });
  assert.equal(minResult.limit, 1);

  const maxResult = buildPagingParams([], { limit: MAX_PAGE_LIMIT });
  assert.equal(maxResult.limit, 200);
});

test("throws RangeError when limit is less than MIN_PAGE_LIMIT", () => {
  assert.throws(
    () => buildPagingParams([], { limit: 0 }),
    RangeError,
  );
  assert.throws(
    () => buildPagingParams([], { limit: -10 }),
    RangeError,
  );
});

test("throws RangeError when limit is greater than MAX_PAGE_LIMIT", () => {
  assert.throws(
    () => buildPagingParams([], { limit: 201 }),
    RangeError,
  );
});

test("throws TypeError when limit is not an integer", () => {
  assert.throws(
    () => buildPagingParams([], { limit: "10" }),
    TypeError,
  );
  assert.throws(
    () => buildPagingParams([], { limit: 10.5 }),
    TypeError,
  );
  assert.throws(
    () => buildPagingParams([], { limit: NaN }),
    TypeError,
  );
});
