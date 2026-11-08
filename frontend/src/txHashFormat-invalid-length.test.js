import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("formatTxHash invalid option lengths", () => {
  it("throws when prefixLength is negative or not an integer", () => {
    expect(() => formatTxHash(HASH, { prefixLength: -1 })).toThrow(
      "prefixLength must be a non-negative integer."
    );
    expect(() => formatTxHash(HASH, { prefixLength: 2.5 })).toThrow(
      "prefixLength must be a non-negative integer."
    );
  });

  it("throws when suffixLength is negative or not an integer", () => {
    expect(() => formatTxHash(HASH, { suffixLength: -3 })).toThrow(
      "suffixLength must be a non-negative integer."
    );
    expect(() => formatTxHash(HASH, { suffixLength: "5" })).toThrow(
      "suffixLength must be a non-negative integer."
    );
  });

  it("throws when both prefixLength and suffixLength are zero", () => {
    expect(() => formatTxHash(HASH, { prefixLength: 0, suffixLength: 0 })).toThrow(
      "prefixLength and suffixLength cannot both be 0."
    );
  });
});
