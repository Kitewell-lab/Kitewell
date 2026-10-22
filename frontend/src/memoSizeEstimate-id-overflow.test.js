import { describe, expect, it } from "vitest";
import { estimateMemoSize } from "./memoSizeEstimate";

describe("memoSizeEstimate id overflow and invalid values", () => {
  it("rejects negative numbers or numbers exceeding uint64", () => {
    // 2^64
    const overflowBig = 18_446_744_073_709_551_616n;
    const resOver = estimateMemoSize("id", overflowBig);
    expect(resOver.valid).toBe(false);

    const resNeg = estimateMemoSize("id", -1);
    expect(resNeg.valid).toBe(false);

    const resAlpha = estimateMemoSize("id", "not-a-number");
    expect(resAlpha.valid).toBe(false);
  });
});
