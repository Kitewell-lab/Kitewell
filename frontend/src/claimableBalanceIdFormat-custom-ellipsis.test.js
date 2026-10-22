import { describe, expect, it } from "vitest";
import { formatClaimableBalanceId } from "./claimableBalanceIdFormat";

const SAMPLE_CB_ID = "00000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("formatClaimableBalanceId custom ellipsis", () => {
  it("supports three-dot ellipsis via positional arguments", () => {
    const formatted = formatClaimableBalanceId(SAMPLE_CB_ID, 8, 4, "...");
    expect(formatted).toBe("00000000...bbbb");
  });

  it("supports custom delimiter string", () => {
    const formatted = formatClaimableBalanceId(SAMPLE_CB_ID, 4, 4, "--");
    expect(formatted).toBe("0000--bbbb");
  });
});
