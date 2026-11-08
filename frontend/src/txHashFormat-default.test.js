import { describe, expect, it } from "vitest";
import { formatTxHash, txHashFormat } from "./txHashFormat";

const VALID_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("formatTxHash default options", () => {
  it("shortens a 64-char transaction hash to 6 characters prefix and 6 characters suffix", () => {
    const formatted = formatTxHash(VALID_HASH);
    expect(formatted).toBe("012345…abcdef");
  });

  it("works with txHashFormat alias and trims whitespace", () => {
    const formatted = txHashFormat(`  ${VALID_HASH}  `);
    expect(formatted).toBe("012345…abcdef");
  });
});
