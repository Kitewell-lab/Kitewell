import test from "node:test";
import assert from "node:assert/strict";

import { estimateSponsorshipReserve } from "./sponsorshipFeeEstimate.js";

test("computes reserve with custom baseReserveXlm option", () => {
  // Custom base reserve 1.0 XLM instead of default 0.5 XLM
  const res = estimateSponsorshipReserve(3, { baseReserveXlm: 1.0 });
  assert.equal(res, "3.0");

  // Custom base reserve 0.1 XLM
  const resSmall = estimateSponsorshipReserve(5, { baseReserveXlm: 0.1 });
  assert.equal(resSmall, "0.5");
});
