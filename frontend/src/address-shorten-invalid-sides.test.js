import test from "node:test";
import assert from "node:assert/strict";

import { shortenAddress } from "./addressShorten.js";

const G = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
test("falls back to a one character side when a length is not a finite number", () => {
  assert.equal(shortenAddress(G, NaN, Infinity), "G...5");
});
