import test from "node:test";
import assert from "node:assert/strict";

import { extractPagingToken } from "./pagingCursorBuilder.js";

test("extracts token from paging_token property", () => {
  assert.equal(extractPagingToken({ paging_token: "12345" }), "12345");
});

test("extracts token from pagingToken camelCase property", () => {
  assert.equal(extractPagingToken({ pagingToken: "98765" }), "98765");
});

test("extracts token from cursor property", () => {
  assert.equal(extractPagingToken({ cursor: "cursor_xyz" }), "cursor_xyz");
});

test("returns null if no token property is found", () => {
  assert.equal(extractPagingToken({}), null);
  assert.equal(extractPagingToken({ paging_token: null }), null);
});

test("throws TypeError when record is not an object", () => {
  assert.throws(() => extractPagingToken(null), TypeError);
  assert.throws(() => extractPagingToken("invalid"), TypeError);
  assert.throws(() => extractPagingToken(123), TypeError);
});
