import { describe, expect, it } from "vitest";
import { tryFormatClaimableBalanceId } from "./claimableBalanceIdFormat";

const SAMPLE_CB_ID = "00000000dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

describe("tryFormatClaimableBalanceId safe formatting", () => {
  it("formats valid ID successfully", () => {
    expect(tryFormatClaimableBalanceId(SAMPLE_CB_ID)).toBe("00000000…dddddd");
  });

  it("returns default null fallback on invalid ID without throwing", () => {
    expect(tryFormatClaimableBalanceId("short-id")).toBeNull();
    expect(tryFormatClaimableBalanceId(null)).toBeNull();
  });

  it("returns custom fallback when specified", () => {
    expect(tryFormatClaimableBalanceId("invalid", {}, "N/A")).toBe("N/A");
  });
});
