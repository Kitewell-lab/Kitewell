import test from "node:test";
import assert from "node:assert/strict";

import { isValidPublicKey } from "./addressValidate.js";
test("rejects a lowercased key", () => {
  assert.equal(
    isValidPublicKey("gbbd47if6lwk7p7mdevscwr7dpuwv3ny3dtevfl4nat4aqh3zllfla5"),
    false
  );
});
