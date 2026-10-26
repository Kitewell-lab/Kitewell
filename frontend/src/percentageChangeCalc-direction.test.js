import { describe, expect, it } from "vitest";
import { calculatePercentageChange } from "./percentageChangeCalc";

describe("percentageChangeCalc direction categorization", () => {
  it("assigns up direction and plus sign to increases", () => {
    const res = calculatePercentageChange("10", "11");
    expect(res.direction).toBe("up");
    expect(res.formatted.startsWith("+")).toBe(true);
  });

  it("assigns down direction and minus sign to decreases", () => {
    const res = calculatePercentageChange("10", "9");
    expect(res.direction).toBe("down");
    expect(res.formatted.startsWith("-")).toBe(true);
  });

  it("assigns flat direction to zero difference", () => {
    const res = calculatePercentageChange("10", "10");
    expect(res.direction).toBe("flat");
    expect(res.formatted).toBe("0.00%");
  });
});
