import test from "node:test";
import assert from "node:assert/strict";

import { redactLogObject } from "./logRedact.js";
test("falls back to defaults when the custom list is empty", () => {
  const result = redactLogObject({ token: "t" }, []);
  assert.equal(result.token, "[REDACTED]");
});
