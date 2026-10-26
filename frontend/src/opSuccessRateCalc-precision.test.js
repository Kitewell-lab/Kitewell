import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

describe("opSuccessRateCalc options: asPercentage and precision", () => {
  it("formats successRate as 0..100 percentage when asPercentage is true", () => {
    const ops = [
      { transaction_successful: true },
      { transaction_successful: false },
    ];

    const result = calculateOpSuccessRate(ops, { asPercentage: true });
    expect(result.successRate).toBe(50);
  });

  it("rounds rate to specified precision", () => {
    // 2 out of 3 = 0.666666...
    const ops = [
      { transaction_successful: true },
      { transaction_successful: true },
      { transaction_successful: false },
    ];

    const ratioResult = calculateOpSuccessRate(ops, { precision: 2 });
    expect(ratioResult.successRate).toBe(0.67);

    const pctResult = calculateOpSuccessRate(ops, { asPercentage: true, precision: 1 });
    expect(pctResult.successRate).toBe(66.7);
  });
});
