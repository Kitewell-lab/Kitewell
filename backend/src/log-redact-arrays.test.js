import test from "node:test";
import assert from "node:assert/strict";

import { redactLogObject } from "./logRedact.js";
test("redacts entries inside arrays", () => {
  const result = redactLogObject({ items: [{ token: "t1" }, { label: "l1" }] });
  assert.deepEqual(result, { items: [{ token: "[REDACTED]" }, { label: "l1" }] });
});
