import test from "node:test";
import assert from "node:assert/strict";
import { formatErrorResponse } from "./errorResponseShape.js";

test("falls back to default code when code is empty", () => {
  const result = formatErrorResponse("", "Some error");
  assert.equal(result.error.code, "INTERNAL_ERROR");
});
