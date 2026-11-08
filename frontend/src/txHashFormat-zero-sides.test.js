import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("formatTxHash zero-length sides", () => {
  it("omits suffix when suffixLength is 0", () => {
    const result = formatTxHash(HASH, { prefixLength: 8, suffixLength: 0 });
    expect(result).toBe("01234567…");
  });

  it("omits prefix when prefixLength is 0", () => {
    const result = formatTxHash(HASH, { prefixLength: 0, suffixLength: 8 });
    expect(result).toBe("…89abcdef");
  });
});
