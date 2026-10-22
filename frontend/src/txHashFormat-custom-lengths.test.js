import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const SAMPLE_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("formatTxHash custom positional lengths", () => {
  it("supports custom prefix and suffix lengths via positional arguments", () => {
    const formatted = formatTxHash(SAMPLE_HASH, 4, 8);
    expect(formatted).toBe("0123…89abcdef");
  });

  it("handles asymmetrical lengths such as 8 prefix and 2 suffix", () => {
    const formatted = formatTxHash(SAMPLE_HASH, 8, 2);
    expect(formatted).toBe("01234567…ef");
  });
});
