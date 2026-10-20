import test from "node:test";
import assert from "node:assert/strict";

import { isValidPublicKey } from "./addressValidate.js";
test("rejects an empty string", () => {
  assert.equal(isValidPublicKey(""), false);
});
