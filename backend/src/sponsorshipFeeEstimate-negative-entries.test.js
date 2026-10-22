import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateSponsorshipReserve,
  checkSponsorshipReserve,
  SponsorshipFeeEstimateError,
} from "./sponsorshipFeeEstimate.js";

test("rejects negative entry count", () => {
  const check = checkSponsorshipReserve(-1);
  assert.equal(check.ok, false);
  assert.equal(check.code, "NEGATIVE_COUNT");

  assert.throws(
    () => estimateSponsorshipReserve(-5),
    (err) => {
      assert.ok(err instanceof SponsorshipFeeEstimateError);
      assert.equal(err.code, "NEGATIVE_COUNT");
      return true;
    }
  );
});

test("rejects negative count within breakdown object", () => {
  const check = checkSponsorshipReserve({ trustlines: -2 });
  assert.equal(check.ok, false);
  assert.equal(check.code, "NEGATIVE_COUNT");
});
