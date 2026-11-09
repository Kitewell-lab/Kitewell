import { describe, expect, it } from "vitest";
import {
  isValidClaimableBalanceId,
  validateClaimableBalanceId,
} from "./claimableBalanceIdFormat.js";
import { CLAIMABLE_BALANCE_ID_ERROR } from "./claimableBalanceIdFormatConstants.js";

const SAMPLE_ID = `00000000${"F".repeat(64)}`;

describe("claimableBalanceIdFormat validate and predicate helpers", () => {
  it("validateClaimableBalanceId returns normalized lowercase id on success", () => {
    expect(validateClaimableBalanceId(SAMPLE_ID)).toEqual({
      ok: true,
      id: SAMPLE_ID.toLowerCase(),
    });
  });

  it("isValidClaimableBalanceId returns a boolean and error constants are frozen", () => {
    expect(isValidClaimableBalanceId(SAMPLE_ID)).toBe(true);
    expect(isValidClaimableBalanceId("00000000short")).toBe(false);
    expect(isValidClaimableBalanceId(null)).toBe(false);
    expect(Object.isFrozen(CLAIMABLE_BALANCE_ID_ERROR)).toBe(true);
  });
});
