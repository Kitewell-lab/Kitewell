import test from "node:test";
import assert from "node:assert/strict";
import { formatErrorResponse } from "./errorResponseShape.js";

test("trims whitespace from code and message", () => {
  const result = formatErrorResponse("  BAD_INPUT  ", "  Invalid field  ");
  assert.equal(result.error.code, "BAD_INPUT");
  assert.equal(result.error.message, "Invalid field");
});
