import test from "node:test";
import assert from "node:assert/strict";
import { isErrorResponse } from "./errorResponseShape.js";

test("returns false when error is an array or non-object", () => {
  assert.equal(isErrorResponse({ error: ["code", "msg"] }), false);
});
