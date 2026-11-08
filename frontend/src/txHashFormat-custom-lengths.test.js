import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const HASH = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

describe("formatTxHash custom prefix and suffix lengths", () => {
  it("shortens with custom prefixLength and suffixLength", () => {
    const result = formatTxHash(HASH, { prefixLength: 4, suffixLength: 4 });
    expect(result).toBe("abcd…6789");
  });

  it("handles asymmetrical prefix and suffix lengths", () => {
    const result = formatTxHash(HASH, { prefixLength: 8, suffixLength: 3 });
    expect(result).toBe("abcdef01…789");
  });
});
