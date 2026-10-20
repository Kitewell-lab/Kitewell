import test from "node:test";
import assert from "node:assert/strict";

import { isValidPublicKey } from "./addressValidate.js";
test("rejects null and undefined", () => {
  assert.equal(isValidPublicKey(null), false);
  assert.equal(isValidPublicKey(undefined), false);
});
