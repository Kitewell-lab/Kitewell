import test from "node:test";
import assert from "node:assert/strict";

import { shortenAddress } from "./addressShorten.js";

const G = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

test("returns the address unchanged when the requested sides do not fit", () => {
  assert.equal(shortenAddress(G, 1, 999), G);
});
