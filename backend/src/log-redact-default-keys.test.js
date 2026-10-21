import test from "node:test";
import assert from "node:assert/strict";

import { redactLogObject } from "./logRedact.js";
test("redacts default sensitive keys", () => {
  const result = redactLogObject({ user: "amy", password: "hunter2", token: "abc123" });
  assert.deepEqual(result, { user: "amy", password: "[REDACTED]", token: "[REDACTED]" });
});
