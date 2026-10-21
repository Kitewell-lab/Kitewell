import test from "node:test";
import assert from "node:assert/strict";

import { redactLogObject } from "./logRedact.js";
test("keeps non-sensitive values untouched", () => {
  const result = redactLogObject({ name: "amy", attempts: 3, active: true });
  assert.deepEqual(result, { name: "amy", attempts: 3, active: true });
});
