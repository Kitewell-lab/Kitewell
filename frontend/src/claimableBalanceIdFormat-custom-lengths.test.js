import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat";

const SAMPLE_CB_ID = "00000000123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0";

describe("formatClaimableBalanceId custom positional lengths", () => {
  it("formats with custom prefix and suffix lengths", () => {
    // 12 leading: "000000001234", 4 trailing: "def0"
    const formatted = formatClaimableBalanceId(SAMPLE_CB_ID, 12, 4);
    expect(formatted).toBe("000000001234…def0");
  });

  it("handles asymmetrical lengths", () => {
    const formatted = formatClaimableBalanceId(SAMPLE_CB_ID, 4, 8);
    expect(formatted).toBe("0000…9abcdef0");
  });
});
