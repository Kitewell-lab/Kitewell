import { describe, expect, it } from "vitest";
import {
  formatClaimableBalanceId,
  validateClaimableBalanceId,
} from "./claimableBalanceIdFormat.js";
import { CLAIMABLE_BALANCE_ID_ERROR } from "./claimableBalanceIdFormatConstants.js";

describe("claimableBalanceIdFormat length and hex character checks", () => {
  it("rejects 71-char and 73-char hex strings", () => {
    const shortId = `00000000${"a".repeat(63)}`;
    const longId = `00000000${"a".repeat(65)}`;

    expect(validateClaimableBalanceId(shortId)).toEqual({
      ok: false,
      error: CLAIMABLE_BALANCE_ID_ERROR.LENGTH,
    });
    expect(validateClaimableBalanceId(longId)).toEqual({
      ok: false,
      error: CLAIMABLE_BALANCE_ID_ERROR.LENGTH,
    });
  });

  it("rejects 72-character strings containing non-hex characters", () => {
    for (const nonHex of [
      `00000000${"g".repeat(64)}`,
      `00000000${"a".repeat(63)}z`,
      `00000000${"a".repeat(63)}-`,
    ]) {
      expect(() => formatClaimableBalanceId(nonHex)).toThrow(
        CLAIMABLE_BALANCE_ID_ERROR.HEX
      );
    }
  });
});
