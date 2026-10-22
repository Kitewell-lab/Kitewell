import test from "node:test";
import assert from "node:assert/strict";

import { buildPagingParams } from "./pagingCursorBuilder.js";

test("extracts cursor from last record with paging_token", () => {
  const records = [
    { id: "1", paging_token: "100" },
    { id: "2", paging_token: "200" },
    { id: "3", paging_token: "300" },
  ];
  const result = buildPagingParams(records, { limit: 10, order: "asc" });
  assert.deepEqual(result, {
    cursor: "300",
    order: "asc",
    limit: 10,
    hasMore: false,
  });
});

test("sets hasMore to true when records length reaches or exceeds limit", () => {
  const records = [
    { id: "1", paging_token: "10" },
    { id: "2", paging_token: "20" },
  ];
  const result = buildPagingParams(records, { limit: 2, order: "desc" });
  assert.deepEqual(result, {
    cursor: "20",
    order: "desc",
    limit: 2,
    hasMore: true,
  });
});
