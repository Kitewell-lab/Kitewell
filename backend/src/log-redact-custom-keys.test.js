import test from "node:test";
import assert from "node:assert/strict";

import { redactLogObject } from "./logRedact.js";
test("uses a custom redaction list when provided", () => {
  const result = redactLogObject({ email: "a@b.c", nickname: "amy" }, ["email"]);
  assert.deepEqual(result, { email: "[REDACTED]", nickname: "amy" });
});
