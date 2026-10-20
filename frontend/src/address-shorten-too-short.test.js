import test from "node:test";
import assert from "node:assert/strict";

import { shortenAddress } from "./addressShorten.js";

const G = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
test("leaves a short address unchanged", () => {
  assert.equal(shortenAddress("GBBD47", 4, 4), "GBBD47");
});
