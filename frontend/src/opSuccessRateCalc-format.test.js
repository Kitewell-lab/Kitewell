import { describe, expect, it } from "vitest";
import { formatSuccessRate } from "./opSuccessRateCalc.js";

describe("formatSuccessRate helper", () => {
  it("formats decimal ratio as percentage string with default 2 decimals", () => {
    expect(formatSuccessRate(0.8525)).toBe("85.25%");
    expect(formatSuccessRate(1)).toBe("100.00%");
    expect(formatSuccessRate(0)).toBe("0.00%");
  });

  it("handles custom decimals and percentage inputs", () => {
    expect(formatSuccessRate(95.678, { isPercentage: true, decimals: 1 })).toBe("95.7%");
    expect(formatSuccessRate(0.5, { decimals: 0 })).toBe("50%");
  });

  it("throws TypeError on non-number inputs", () => {
    expect(() => formatSuccessRate("0.5")).toThrow(TypeError);
    expect(() => formatSuccessRate(NaN)).toThrow("Rate must be a valid number.");
  });
});
