import { describe, expect, it } from "vitest";
import { estimateMemoSize } from "./memoSizeEstimate";

describe("memoSizeEstimate id valid path", () => {
  it("validates 64-bit unsigned integer ID inputs", () => {
    const resNum = estimateMemoSize("id", 12345);
    expect(resNum.byteLength).toBe(8);
    expect(resNum.maxBytes).toBe(8);
    expect(resNum.valid).toBe(true);
    expect(resNum.remainingBytes).toBe(0);

    const resBig = estimateMemoSize("id", 18_446_744_073_709_551_615n);
    expect(resBig.valid).toBe(true);

    const resStr = estimateMemoSize("id", "999999");
    expect(resStr.valid).toBe(true);
  });
});
