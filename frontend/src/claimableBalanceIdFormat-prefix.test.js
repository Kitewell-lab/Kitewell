import { describe, expect, it } from "vitest";
import {
  formatClaimableBalanceId,
  validateClaimableBalanceId,
} from "./claimableBalanceIdFormat.js";
import { CLAIMABLE_BALANCE_ID_ERROR } from "./claimableBalanceIdFormatConstants.js";

describe("claimableBalanceIdFormat V0 type prefix check", () => {
  it("rejects 72-hex strings that do not begin with 00000000", () => {
    for (const badPrefix of [
      `00000001${"a".repeat(64)}`,
      `10000000${"a".repeat(64)}`,
      `ffffffff${"a".repeat(64)}`,
    ]) {
      expect(validateClaimableBalanceId(badPrefix)).toEqual({
        ok: false,
        error: CLAIMABLE_BALANCE_ID_ERROR.PREFIX,
      });
      expect(() => formatClaimableBalanceId(badPrefix)).toThrow(
        CLAIMABLE_BALANCE_ID_ERROR.PREFIX
      );
    }
  });
});
