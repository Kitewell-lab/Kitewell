import test from "node:test";
import assert from "node:assert/strict";

import { redactLogObject } from "./logRedact.js";
test("matches key names case-insensitively", () => {
  const result = redactLogObject({ PassWord: "x", SECRET: "y" });
  assert.deepEqual(result, { PassWord: "[REDACTED]", SECRET: "[REDACTED]" });
});
