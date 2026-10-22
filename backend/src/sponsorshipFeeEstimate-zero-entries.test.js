import test from "node:test";
import assert from "node:assert/strict";

import { estimateSponsorshipReserve, checkSponsorshipReserve } from "./sponsorshipFeeEstimate.js";

test("computes zero reserve for 0 entries", () => {
  assert.equal(estimateSponsorshipReserve(0), "0.0");
  assert.equal(estimateSponsorshipReserve("0"), "0.0");

  const check = checkSponsorshipReserve(0);
  assert.equal(check.ok, true);
  assert.equal(check.reserveXlm, "0.0");
  assert.equal(check.reserveStroops, "0");
  assert.equal(check.totalEntries, 0);
});
