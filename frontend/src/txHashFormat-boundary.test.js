import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const HASH = "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff";

describe("formatTxHash boundary conditions", () => {
  it("returns full hash unchanged when prefix + suffix equals 64", () => {
    const result = formatTxHash(HASH, { prefixLength: 32, suffixLength: 32 });
    expect(result).toBe(HASH);
  });

  it("returns full hash unchanged when prefix + suffix exceeds 64", () => {
    const result = formatTxHash(HASH, { prefixLength: 40, suffixLength: 30 });
    expect(result).toBe(HASH);
  });

  it("shortens hash when prefix + suffix is 63 (boundary just below 64)", () => {
    const result = formatTxHash(HASH, { prefixLength: 32, suffixLength: 31 });
    expect(result).toBe(`${HASH.slice(0, 32)}…${HASH.slice(-31)}`);
  });
});
