import { describe, expect, it } from "vitest";
import defaultCalc, {
  percentageChangeCalc,
  calculatePercentageChange,
} from "./percentageChangeCalc";

describe("percentageChangeCalc export aliases", () => {
  it("default and named exports point to calculatePercentageChange", () => {
    expect(defaultCalc).toBe(calculatePercentageChange);
    expect(percentageChangeCalc).toBe(calculatePercentageChange);
  });
});
