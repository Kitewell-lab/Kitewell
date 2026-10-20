import test from "node:test";
import assert from "node:assert/strict";

import { shortenAddress } from "./addressShorten.js";

const G = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
test("honours custom prefix and suffix lengths", () => {
  assert.equal(shortenAddress(G, 6, 2), "GBBD47...A5");
});
