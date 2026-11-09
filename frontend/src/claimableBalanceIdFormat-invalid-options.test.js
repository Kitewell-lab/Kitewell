import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat.js";
import { CLAIMABLE_BALANCE_ID_ERROR } from "./claimableBalanceIdFormatConstants.js";

const SAMPLE_ID = `00000000${"b".repeat(64)}`;

describe("claimableBalanceIdFormat invalid options", () => {
  it("rejects non-object options", () => {
    for (const badOpts of [null, "6", 6, []]) {
      expect(() => formatClaimableBalanceId(SAMPLE_ID, badOpts)).toThrow(
        TypeError
      );
    }
  });

  it("rejects negative, fractional, or non-numeric prefixLength and suffixLength", () => {
    for (const badLen of [-1, 2.5, "6", NaN]) {
      expect(() =>
        formatClaimableBalanceId(SAMPLE_ID, { prefixLength: badLen })
      ).toThrow(CLAIMABLE_BALANCE_ID_ERROR.PREFIX_LENGTH);
      expect(() =>
        formatClaimableBalanceId(SAMPLE_ID, { suffixLength: badLen })
      ).toThrow(CLAIMABLE_BALANCE_ID_ERROR.SUFFIX_LENGTH);
    }
  });

  it("rejects prefixLength = 0 and suffixLength = 0 together", () => {
    expect(() =>
      formatClaimableBalanceId(SAMPLE_ID, { prefixLength: 0, suffixLength: 0 })
    ).toThrow(CLAIMABLE_BALANCE_ID_ERROR.BOTH_ZERO);
  });
});
