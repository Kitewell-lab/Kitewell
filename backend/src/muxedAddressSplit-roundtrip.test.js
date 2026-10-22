import test from "node:test";
import assert from "node:assert/strict";
import { splitMuxedAddress, combineMuxedAddress } from "./muxedAddressSplit.js";

test("split and combine maintain complete roundtrip fidelity", () => {
  const originalG = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const originalId = "9876543210";

  const muxed = combineMuxedAddress(originalG, originalId);
  const parsed = splitMuxedAddress(muxed);

  assert.equal(parsed.baseAddress, originalG);
  assert.equal(parsed.id, originalId);

  const reconstituted = combineMuxedAddress(parsed.baseAddress, parsed.id);
  assert.equal(reconstituted, muxed);
});
