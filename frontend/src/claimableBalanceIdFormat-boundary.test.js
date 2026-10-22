import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat";

const SAMPLE_CB_ID = "00000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("formatClaimableBalanceId boundary conditions", () => {
  it("returns full un-truncated ID when prefix + suffix equals 72", () => {
    expect(formatClaimableBalanceId(SAMPLE_CB_ID, 36, 36)).toBe(SAMPLE_CB_ID);
  });

  it("returns full un-truncated ID when prefix + suffix exceeds 72", () => {
    expect(formatClaimableBalanceId(SAMPLE_CB_ID, 50, 50)).toBe(SAMPLE_CB_ID);
  });

  it("handles zero prefix properly", () => {
    expect(formatClaimableBalanceId(SAMPLE_CB_ID, 0, 8, "…")).toBe("…aaaaaaaa");
  });

  it("handles zero suffix properly", () => {
    expect(formatClaimableBalanceId(SAMPLE_CB_ID, 8, 0, "…")).toBe("00000000…");
  });
});
