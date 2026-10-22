import { describe, expect, it } from "vitest";
import { formatTxHash, isValidTxHash, InvalidTxHashError } from "./txHashFormat";

describe("formatTxHash invalid hash validation", () => {
  it("rejects non-string inputs", () => {
    expect(isValidTxHash(null)).toBe(false);
    expect(isValidTxHash(undefined)).toBe(false);
    expect(isValidTxHash(12345)).toBe(false);
    expect(isValidTxHash({})).toBe(false);

    expect(() => formatTxHash(null)).toThrow(InvalidTxHashError);
    expect(() => formatTxHash(undefined)).toThrow(InvalidTxHashError);
  });

  it("rejects string with incorrect length", () => {
    const tooShort = "a".repeat(63);
    const tooLong = "a".repeat(65);

    expect(isValidTxHash(tooShort)).toBe(false);
    expect(isValidTxHash(tooLong)).toBe(false);

    expect(() => formatTxHash(tooShort)).toThrow(InvalidTxHashError);
    expect(() => formatTxHash(tooLong)).toThrow(InvalidTxHashError);
  });

  it("rejects 64-char strings containing non-hex characters", () => {
    const nonHex = "g".repeat(64);
    const withWhitespace = " " + "a".repeat(63);

    expect(isValidTxHash(nonHex)).toBe(false);
    expect(isValidTxHash(withWhitespace)).toBe(false);

    expect(() => formatTxHash(nonHex)).toThrow(InvalidTxHashError);
    expect(() => formatTxHash(withWhitespace)).toThrow(InvalidTxHashError);
  });
});
