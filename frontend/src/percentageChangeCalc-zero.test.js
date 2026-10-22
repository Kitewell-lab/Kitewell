import { describe, expect, it } from "vitest";
import { calculatePercentageChange } from "./percentageChangeCalc";

describe("percentageChangeCalc zero handling", () => {
  it("safely handles previous balance 0 without division by zero", () => {
    const result = calculatePercentageChange("0", "50");
    expect(result.percentage).toBeNull();
    expect(result.direction).toBe("up");
    expect(result.difference).toBe("+50");
    expect(result.formatted).toBe("N/A");
    expect(result.isInfinite).toBe(true);
  });

  it("handles previous balance 0 with custom fallback values", () => {
    const result = calculatePercentageChange("0", "50", {
      zeroPreviousFallback: 100,
      zeroPreviousFormat: "+100%",
    });
    expect(result.percentage).toBe(100);
    expect(result.formatted).toBe("+100%");
    expect(result.isInfinite).toBe(true);
  });

  it("handles 0 to 0 as flat 0%", () => {
    const result = calculatePercentageChange("0", "0");
    expect(result.percentage).toBe(0);
    expect(result.direction).toBe("flat");
    expect(result.formatted).toBe("0.00%");
    expect(result.isInfinite).toBe(false);
  });
});
