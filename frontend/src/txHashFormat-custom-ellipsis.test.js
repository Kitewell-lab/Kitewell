import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const SAMPLE_HASH = "deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef";

describe("formatTxHash custom ellipsis delimiter", () => {
  it("allows standard three-dot ellipsis via positional arguments", () => {
    const formatted = formatTxHash(SAMPLE_HASH, 6, 6, "...");
    expect(formatted).toBe("deadbe...abcdef");
  });

  it("allows custom separators like dashes or colons", () => {
    const formatted = formatTxHash(SAMPLE_HASH, 4, 4, "---");
    expect(formatted).toBe("dead---cdef");
  });
});
