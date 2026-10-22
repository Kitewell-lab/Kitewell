import test from "node:test";
import assert from "node:assert/strict";

import { checkSponsorshipReserve, estimateSponsorshipReserve } from "./sponsorshipFeeEstimate.js";

test("rejects fractional entry count", () => {
  assert.equal(checkSponsorshipReserve(1.5).code, "NON_INTEGER_COUNT");
  assert.equal(checkSponsorshipReserve({ signers: 0.5 }).code, "NON_INTEGER_COUNT");
});

test("rejects NaN, Infinity, and invalid string formats", () => {
  assert.equal(checkSponsorshipReserve(NaN).code, "INVALID_COUNT_TYPE");
  assert.equal(checkSponsorshipReserve(Infinity).code, "INVALID_COUNT_TYPE");
  assert.equal(checkSponsorshipReserve("not-a-number").code, "INVALID_COUNT_FORMAT");
});
