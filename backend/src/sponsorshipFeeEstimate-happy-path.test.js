import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateSponsorshipReserve,
  checkSponsorshipReserve,
  BASE_RESERVE_XLM,
} from "./sponsorshipFeeEstimate.js";

test("computes reserve for 1 entry (0.5 XLM)", () => {
  assert.equal(estimateSponsorshipReserve(1), "0.5");
  assert.equal(estimateSponsorshipReserve("1"), "0.5");

  const check = checkSponsorshipReserve(1);
  assert.equal(check.ok, true);
  assert.equal(check.reserveXlm, "0.5");
  assert.equal(check.reserveStroops, "5000000");
});

test("computes reserve for multiple entries", () => {
  assert.equal(estimateSponsorshipReserve(2), "1.0");
  assert.equal(estimateSponsorshipReserve(10), "5.0");
});
