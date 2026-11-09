import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat.js";
import { CLAIMABLE_BALANCE_ID_LENGTH } from "./claimableBalanceIdFormatConstants.js";

const SAMPLE_ID = `00000000${"a".repeat(64)}`;

describe("claimableBalanceIdFormat shortening boundary", () => {
  it("returns the full 72-character ID without ellipsis when prefixLength + suffixLength >= 72", () => {
    expect(
      formatClaimableBalanceId(SAMPLE_ID, { prefixLength: 36, suffixLength: 36 })
    ).toBe(SAMPLE_ID);

    expect(
      formatClaimableBalanceId(SAMPLE_ID, { prefixLength: 40, suffixLength: 40 })
    ).toBe(SAMPLE_ID);
  });

  it("inserts an ellipsis when prefixLength + suffixLength is 71 (one less than 72)", () => {
    const formatted = formatClaimableBalanceId(SAMPLE_ID, {
      prefixLength: 36,
      suffixLength: 35,
    });
    expect(formatted.length).toBe(CLAIMABLE_BALANCE_ID_LENGTH);
    expect(formatted).toContain("…");
  });
});
