import { describe, expect, it } from "vitest";
import {
  formatClaimableBalanceId,
  validateClaimableBalanceId,
} from "./claimableBalanceIdFormat.js";
import { CLAIMABLE_BALANCE_ID_ERROR } from "./claimableBalanceIdFormatConstants.js";

describe("claimableBalanceIdFormat non-string and empty inputs", () => {
  it("rejects non-string inputs", () => {
    for (const invalid of [null, undefined, 123, true, {}, []]) {
      expect(validateClaimableBalanceId(invalid)).toEqual({
        ok: false,
        error: CLAIMABLE_BALANCE_ID_ERROR.TYPE,
      });
      expect(() => formatClaimableBalanceId(invalid)).toThrow(TypeError);
    }
  });

  it("rejects empty or whitespace-only strings", () => {
    for (const empty of ["", "   ", "\n\t"]) {
      expect(validateClaimableBalanceId(empty)).toEqual({
        ok: false,
        error: CLAIMABLE_BALANCE_ID_ERROR.EMPTY,
      });
      expect(() => formatClaimableBalanceId(empty)).toThrow(
        CLAIMABLE_BALANCE_ID_ERROR.EMPTY
      );
    }
  });
});
