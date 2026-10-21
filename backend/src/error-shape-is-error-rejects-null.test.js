import test from "node:test";
import assert from "node:assert/strict";
import { isErrorResponse } from "./errorResponseShape.js";

test("returns false for null or primitive input", () => {
  assert.equal(isErrorResponse(null), false);
  assert.equal(isErrorResponse("string"), false);
});
