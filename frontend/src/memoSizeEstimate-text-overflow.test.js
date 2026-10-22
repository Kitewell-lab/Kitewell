import { describe, expect, it } from "vitest";
import { estimateMemoSize } from "./memoSizeEstimate";

describe("memoSizeEstimate text overflow", () => {
  it("marks valid=false and remainingBytes=0 when text exceeds 28 bytes", () => {
    // 29 ASCII characters
    const text29 = "12345678901234567890123456789";
    const res = estimateMemoSize("text", text29);
    expect(res.byteLength).toBe(29);
    expect(res.maxBytes).toBe(28);
    expect(res.valid).toBe(false);
    expect(res.remainingBytes).toBe(0);
  });
});
