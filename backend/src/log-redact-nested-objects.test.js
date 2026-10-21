import test from "node:test";
import assert from "node:assert/strict";

import { redactLogObject } from "./logRedact.js";
test("redacts keys nested inside child objects", () => {
  const result = redactLogObject({ session: { id: "s1", secret: "abc" } });
  assert.deepEqual(result, { session: { id: "s1", secret: "[REDACTED]" } });
});
