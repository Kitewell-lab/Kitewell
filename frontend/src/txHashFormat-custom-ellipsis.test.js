import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("formatTxHash custom ellipsis", () => {
  it("uses standard ascii three dots when requested", () => {
    const result = formatTxHash(HASH, { ellipsis: "..." });
    expect(result).toBe("012345...abcdef");
  });

  it("supports custom separator string", () => {
    const result = formatTxHash(HASH, { prefixLength: 4, suffixLength: 4, ellipsis: "--" });
    expect(result).toBe("0123--cdef");
  });
});
