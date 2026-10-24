import { describe, expect, it } from "vitest";
import { estimateMemoSize } from "./memoSizeEstimate";

describe("memoSizeEstimate text happy path", () => {
  it("estimates byte size accurately for standard ASCII text", () => {
    const res = estimateMemoSize("text", "hello world");
    expect(res.type).toBe("text");
    expect(res.byteLength).toBe(11);
    expect(res.maxBytes).toBe(28);
    expect(res.valid).toBe(true);
    expect(res.remainingBytes).toBe(17);
  });

  it("calculates multi-byte UTF-8 characters accurately", () => {
    // "🚀" is 4 bytes in UTF-8
    const res = estimateMemoSize("text", "🚀");
    expect(res.byteLength).toBe(4);
    expect(res.valid).toBe(true);
    expect(res.remainingBytes).toBe(24);
  });
});
