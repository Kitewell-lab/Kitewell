import test from "node:test";
import assert from "node:assert/strict";

import { shortenAddress } from "./addressShorten.js";

const G = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
test("keeps one character on each side at the minimum", () => {
  assert.equal(shortenAddress("GBA", 1, 1), "G...A");
});
