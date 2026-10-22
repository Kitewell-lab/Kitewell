import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const SAMPLE_HASH = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

describe("formatTxHash boundary conditions", () => {
  it("returns full un-truncated hash when prefix + suffix equals 64", () => {
    expect(formatTxHash(SAMPLE_HASH, 32, 32)).toBe(SAMPLE_HASH);
  });

  it("returns full un-truncated hash when prefix + suffix exceeds 64", () => {
    expect(formatTxHash(SAMPLE_HASH, 40, 40)).toBe(SAMPLE_HASH);
  });

  it("handles zero prefix properly", () => {
    expect(formatTxHash(SAMPLE_HASH, 0, 6, "…")).toBe("…abcdef");
  });

  it("handles zero suffix properly", () => {
    expect(formatTxHash(SAMPLE_HASH, 6, 0, "…")).toBe("123456…");
  });
});
