import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId, isValidClaimableBalanceId } from "./claimableBalanceIdFormat";

// 8-char type '00000000' + 64-char hash
const SAMPLE_CB_ID = "00000000a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0";

describe("formatClaimableBalanceId defaults", () => {
  it("validates well-formed 72-hex-character ID", () => {
    expect(isValidClaimableBalanceId(SAMPLE_CB_ID)).toBe(true);
  });

  it("formats with default 8 leading and 6 trailing characters", () => {
    const formatted = formatClaimableBalanceId(SAMPLE_CB_ID);
    expect(formatted).toBe("00000000…bcdef0");
    expect(formatted.startsWith("00000000")).toBe(true);
    expect(formatted.endsWith("bcdef0")).toBe(true);
  });
});
