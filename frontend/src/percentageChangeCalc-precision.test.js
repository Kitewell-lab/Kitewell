import { describe, expect, it } from "vitest";
import { calculatePercentageChange } from "./percentageChangeCalc";

describe("percentageChangeCalc stroop precision", () => {
  it("accurately detects single stroop changes (0.0000001)", () => {
    const result = calculatePercentageChange("1.0000000", "1.0000001", { decimals: 6 });
    expect(result.direction).toBe("up");
    expect(result.differenceStroops).toBe(1n);
    expect(result.percentage).toBeCloseTo(0.00001, 5);
  });

  it("handles large balance numbers with precision", () => {
    const result = calculatePercentageChange("10000000", "20000000");
    expect(result.percentage).toBe(100);
    expect(result.formatted).toBe("+100.00%");
  });
});
