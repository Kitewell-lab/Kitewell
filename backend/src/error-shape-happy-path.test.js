import test from "node:test";
import assert from "node:assert/strict";
import { formatErrorResponse } from "./errorResponseShape.js";

test("formats error response with code and message", () => {
  const result = formatErrorResponse("NOT_FOUND", "Resource not found");
  assert.deepEqual(result, { error: { code: "NOT_FOUND", message: "Resource not found" } });
});
