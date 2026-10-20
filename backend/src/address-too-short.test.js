import test from "node:test";
import assert from "node:assert/strict";

import { isValidPublicKey } from "./addressValidate.js";
test("rejects a key that is one character too short", () => {
  assert.equal(
    isValidPublicKey("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA"),
    false
  );
});
