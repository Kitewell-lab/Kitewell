import test from "node:test";
import assert from "node:assert/strict";
import { formatErrorResponse } from "./errorResponseShape.js";

test("falls back to default message when message is null or empty", () => {
  const result = formatErrorResponse("BAD_REQUEST", null);
  assert.equal(result.error.message, "An unexpected error occurred.");
});
