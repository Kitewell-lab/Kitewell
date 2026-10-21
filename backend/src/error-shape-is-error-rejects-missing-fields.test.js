import test from "node:test";
import assert from "node:assert/strict";
import { isErrorResponse } from "./errorResponseShape.js";

test("returns false when code or message is missing or non-string", () => {
  assert.equal(isErrorResponse({ error: { code: 123, message: "msg" } }), false);
  assert.equal(isErrorResponse({ error: { code: "ERR" } }), false);
});
