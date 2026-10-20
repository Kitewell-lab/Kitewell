import test from "node:test";
import assert from "node:assert/strict";

import { isValidPublicKey } from "./addressValidate.js";
test("rejects a valid length key that does not start with G", () => {
  assert.equal(
    isValidPublicKey("ABBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"),
    false
  );
});
