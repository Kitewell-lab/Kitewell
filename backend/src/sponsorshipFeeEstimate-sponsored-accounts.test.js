import test from "node:test";
import assert from "node:assert/strict";

import { estimateSponsorshipReserve, checkSponsorshipReserve } from "./sponsorshipFeeEstimate.js";

test("charges 2 base reserves for sponsored new account", () => {
  // 1 account = 2 base reserves = 1.0 XLM
  assert.equal(estimateSponsorshipReserve({ accounts: 1 }), "1.0");

  // 1 account + 1 trustline = 3 base reserves = 1.5 XLM
  assert.equal(estimateSponsorshipReserve({ accounts: 1, trustlines: 1 }), "1.5");

  const check = checkSponsorshipReserve({ accounts: 2 });
  assert.equal(check.ok, true);
  assert.equal(check.totalEntries, 4);
  assert.equal(check.reserveXlm, "2.0");
});
