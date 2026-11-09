import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat.js";

const SAMPLE_ID = `00000000${"a1b2c3d4".repeat(7)}ef987654`;

describe("claimableBalanceIdFormat happy path", () => {
  it("formats a valid 72-hex claimable balance ID with default 6/6 lengths", () => {
    expect(formatClaimableBalanceId(SAMPLE_ID)).toBe("000000…987654");
  });

  it("trims surrounding whitespace and normalizes uppercase hex to lowercase", () => {
    const upper = `  00000000${"A1B2C3D4".repeat(7)}EF987654  `;
    expect(formatClaimableBalanceId(upper)).toBe("000000…987654");
  });
});
