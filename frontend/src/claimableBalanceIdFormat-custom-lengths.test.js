import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat.js";

const SAMPLE_ID = `0000000012345678${"0".repeat(48)}abcdef12`;

describe("claimableBalanceIdFormat custom prefixLength and suffixLength", () => {
  it("formats with custom prefixLength and suffixLength", () => {
    expect(
      formatClaimableBalanceId(SAMPLE_ID, { prefixLength: 10, suffixLength: 8 })
    ).toBe("0000000012…abcdef12");
  });

  it("supports a zero-length prefix or suffix when the other side is positive", () => {
    expect(
      formatClaimableBalanceId(SAMPLE_ID, { prefixLength: 8, suffixLength: 0 })
    ).toBe("00000000…");
    expect(
      formatClaimableBalanceId(SAMPLE_ID, { prefixLength: 0, suffixLength: 8 })
    ).toBe("…abcdef12");
  });
});
