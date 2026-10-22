import { describe, expect, it } from "vitest";
import { formatTxHash, isValidTxHash } from "./txHashFormat";

const SAMPLE_HASH = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0";

describe("formatTxHash defaults", () => {
  it("recognizes a valid 64-char hex hash", () => {
    expect(isValidTxHash(SAMPLE_HASH)).toBe(true);
  });

  it("formats hash with default 6 leading, ellipsis, and 6 trailing characters", () => {
    const formatted = formatTxHash(SAMPLE_HASH);
    expect(formatted).toBe("a1b2c3…bcdef0");
    expect(formatted.startsWith("a1b2c3")).toBe(true);
    expect(formatted.endsWith("bcdef0")).toBe(true);
    expect(formatted.includes("…")).toBe(true);
  });
});
