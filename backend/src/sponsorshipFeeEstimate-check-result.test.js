import test from "node:test";
import assert from "node:assert/strict";

import {
  checkSponsorshipReserve,
  isValidSponsorshipReserveInput,
} from "./sponsorshipFeeEstimate.js";

test("checkSponsorshipReserve returns structured details on success", () => {
  const res = checkSponsorshipReserve(4);
  assert.equal(res.ok, true);
  assert.equal(res.totalEntries, 4);
  assert.equal(res.reserveXlm, "2.0");
  assert.equal(res.reserveStroops, "20000000");
  assert.equal(isValidSponsorshipReserveInput(4), true);
});

test("checkSponsorshipReserve returns structured error on failure", () => {
  const res = checkSponsorshipReserve(-2);
  assert.equal(res.ok, false);
  assert.equal(res.code, "NEGATIVE_COUNT");
  assert.equal(typeof res.error, "string");
  assert.equal(isValidSponsorshipReserveInput(-2), false);
});
