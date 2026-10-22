import { describe, expect, it } from "vitest";
import { calculatePercentageChange } from "./percentageChangeCalc";

describe("percentageChangeCalc input validations", () => {
  it("throws TypeError on null, undefined, or empty string", () => {
    expect(() => calculatePercentageChange(null, "10")).toThrow(TypeError);
    expect(() => calculatePercentageChange("10", undefined)).toThrow(TypeError);
    expect(() => calculatePercentageChange("", "10")).toThrow(TypeError);
    expect(() => calculatePercentageChange("10", "   ")).toThrow(TypeError);
  });

  it("throws RangeError on negative inputs", () => {
    expect(() => calculatePercentageChange("-5", "10")).toThrow(RangeError);
    expect(() => calculatePercentageChange("10", "-5")).toThrow(RangeError);
  });

  it("throws RangeError on values exceeding 7 decimal places", () => {
    expect(() => calculatePercentageChange("1.12345678", "10")).toThrow(RangeError);
    expect(() => calculatePercentageChange("10", "1.12345678")).toThrow(RangeError);
  });
});
