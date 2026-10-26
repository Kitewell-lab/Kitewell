import { describe, expect, it } from "vitest";
import { calculatePercentageChange } from "./percentageChangeCalc";

describe("percentageChangeCalc decimals option", () => {
  it("formats percentage with specified decimal places", () => {
    const res0 = calculatePercentageChange("100", "133.3333333", { decimals: 0 });
    expect(res0.formatted).toBe("+33%");

    const res1 = calculatePercentageChange("100", "133.3333333", { decimals: 1 });
    expect(res1.formatted).toBe("+33.3%");

    const res4 = calculatePercentageChange("100", "133.3333333", { decimals: 4 });
    expect(res4.formatted).toBe("+33.3333%");
  });

  it("throws RangeError on invalid decimals value", () => {
    expect(() => calculatePercentageChange("100", "110", { decimals: -1 })).toThrow(RangeError);
    expect(() => calculatePercentageChange("100", "110", { decimals: 11 })).toThrow(RangeError);
    expect(() => calculatePercentageChange("100", "110", { decimals: 2.5 })).toThrow(RangeError);
  });
});
