import { describe, expect, it } from "vitest";
import { calculatePercentageChange } from "./percentageChangeCalc";

describe("percentageChangeCalc happy path", () => {
  it("calculates positive percentage change correctly", () => {
    const result = calculatePercentageChange("100", "125");
    expect(result.percentage).toBe(25);
    expect(result.direction).toBe("up");
    expect(result.difference).toBe("+25");
    expect(result.formatted).toBe("+25.00%");
    expect(result.isInfinite).toBe(false);
  });

  it("calculates negative percentage change correctly", () => {
    const result = calculatePercentageChange("100", "80");
    expect(result.percentage).toBe(-20);
    expect(result.direction).toBe("down");
    expect(result.difference).toBe("-20");
    expect(result.formatted).toBe("-20.00%");
    expect(result.isInfinite).toBe(false);
  });

  it("reports 0% change when balances are equal", () => {
    const result = calculatePercentageChange("50.5", "50.5");
    expect(result.percentage).toBe(0);
    expect(result.direction).toBe("flat");
    expect(result.difference).toBe("0");
    expect(result.formatted).toBe("0.00%");
    expect(result.isInfinite).toBe(false);
  });
});
