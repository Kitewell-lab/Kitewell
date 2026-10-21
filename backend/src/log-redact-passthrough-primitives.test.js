import test from "node:test";
import assert from "node:assert/strict";

import { redactLogObject } from "./logRedact.js";
test("returns non-object input unchanged", () => {
  assert.equal(redactLogObject("plain"), "plain");
  assert.equal(redactLogObject(42), 42);
  assert.equal(redactLogObject(null), null);
});
