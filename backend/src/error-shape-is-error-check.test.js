import test from "node:test";
import assert from "node:assert/strict";
import { isErrorResponse } from "./errorResponseShape.js";

test("returns true for a valid error response shape", () => {
  assert.equal(isErrorResponse({ error: { code: "ERR", message: "msg" } }), true);
});
