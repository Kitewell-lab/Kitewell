import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const SAMPLE_HASH = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

describe("formatTxHash options object", () => {
  it("accepts an options object with partial overrides", () => {
    const formatted = formatTxHash(SAMPLE_HASH, { prefixLength: 8 });
    expect(formatted).toBe("abcdef01…456789");
  });

  it("accepts full options object configuration", () => {
    const formatted = formatTxHash(SAMPLE_HASH, {
      prefixLength: 5,
      suffixLength: 5,
      ellipsis: " ~ "
    });
    expect(formatted).toBe("abcde ~ 56789");
  });
});
