import test from "node:test";
import assert from "node:assert/strict";

import { estimateSponsorshipReserve, checkSponsorshipReserve } from "./sponsorshipFeeEstimate.js";

test("computes total reserve from breakdown entries object", () => {
  const breakdown = {
    trustlines: 2,
    signers: 1,
    dataEntries: 1,
    offers: 0,
  };

  // Total 4 entries = 2.0 XLM
  assert.equal(estimateSponsorshipReserve(breakdown), "2.0");

  const check = checkSponsorshipReserve(breakdown);
  assert.equal(check.ok, true);
  assert.equal(check.totalEntries, 4);
  assert.equal(check.reserveXlm, "2.0");
});
