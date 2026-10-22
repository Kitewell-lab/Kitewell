import { describe, expect, it } from "vitest";
import { estimateMemoSize } from "./memoSizeEstimate";

describe("memoSizeEstimate none memo", () => {
  it("treats none memo type as 0 bytes and valid", () => {
    const res = estimateMemoSize("none");
    expect(res.type).toBe("none");
    expect(res.byteLength).toBe(0);
    expect(res.maxBytes).toBe(0);
    expect(res.valid).toBe(true);
    expect(res.remainingBytes).toBe(0);
  });
});
