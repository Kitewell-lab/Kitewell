import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId, isValidClaimableBalanceId, InvalidClaimableBalanceIdError } from "./claimableBalanceIdFormat";

describe("formatClaimableBalanceId validation error cases", () => {
  it("rejects non-string inputs", () => {
    expect(isValidClaimableBalanceId(null)).toBe(false);
    expect(isValidClaimableBalanceId(undefined)).toBe(false);
    expect(isValidClaimableBalanceId(12345)).toBe(false);

    expect(() => formatClaimableBalanceId(null)).toThrow(InvalidClaimableBalanceIdError);
  });

  it("rejects inputs with incorrect character length", () => {
    const tooShort = "0".repeat(71);
    const tooLong = "0".repeat(73);

    expect(isValidClaimableBalanceId(tooShort)).toBe(false);
    expect(isValidClaimableBalanceId(tooLong)).toBe(false);

    expect(() => formatClaimableBalanceId(tooShort)).toThrow(InvalidClaimableBalanceIdError);
    expect(() => formatClaimableBalanceId(tooLong)).toThrow(InvalidClaimableBalanceIdError);
  });

  it("rejects 72-character strings containing non-hex characters", () => {
    const nonHex = "g".repeat(72);
    expect(isValidClaimableBalanceId(nonHex)).toBe(false);
    expect(() => formatClaimableBalanceId(nonHex)).toThrow(InvalidClaimableBalanceIdError);
  });
});
