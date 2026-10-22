import { describe, expect, it } from "vitest";
import { parseClaimableBalanceId } from "./claimableBalanceIdFormat";

const HASH_PART = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
const SAMPLE_CB_ID = `00000000${HASH_PART}`;

describe("parseClaimableBalanceId decomposition", () => {
  it("decomposes 72-hex-character ID into 8-char type and 64-char hash", () => {
    const parts = parseClaimableBalanceId(SAMPLE_CB_ID);
    expect(parts.type).toBe("00000000");
    expect(parts.hash).toBe(HASH_PART);
    expect(parts.hash).toHaveLength(64);
  });
});
