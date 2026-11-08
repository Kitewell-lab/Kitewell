import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

describe("formatTxHash non-hex or malformed hash format", () => {
  it("throws when txHash has invalid length (too short or too long)", () => {
    expect(() => formatTxHash("0123456789abcdef")).toThrow(
      "Invalid transaction hash. Expected a 64-character hexadecimal string."
    );
    expect(() => formatTxHash("0123456789abcdef".repeat(5))).toThrow(
      "Invalid transaction hash. Expected a 64-character hexadecimal string."
    );
  });

  it("throws when txHash contains non-hex characters", () => {
    const invalidCharsHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789xyz123";
    expect(() => formatTxHash(invalidCharsHash)).toThrow(
      "Invalid transaction hash. Expected a 64-character hexadecimal string."
    );
  });
});
