import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat";

const SAMPLE_CB_ID = "00000000cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

describe("formatClaimableBalanceId options object", () => {
  it("accepts partial option overrides", () => {
    const formatted = formatClaimableBalanceId(SAMPLE_CB_ID, { prefixLength: 10 });
    expect(formatted).toBe("00000000cc…cccccc");
  });

  it("accepts full options configuration", () => {
    const formatted = formatClaimableBalanceId(SAMPLE_CB_ID, {
      prefixLength: 8,
      suffixLength: 8,
      ellipsis: " ~ "
    });
    expect(formatted).toBe("00000000 ~ cccccccc");
  });
});
