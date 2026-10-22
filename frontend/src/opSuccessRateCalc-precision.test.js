import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc";

describe("opSuccessRateCalc precision options", () => {
  it("formats decimal rate with requested precision digits", () => {
    // 2 success out of 3 = 66.6666...%
    const ops = [
      { transaction_successful: true },
      { transaction_successful: true },
      { transaction_successful: false },
    ];

    const resDefault = calculateOpSuccessRate(ops);
    expect(resDefault.successRate).toBe(66.7);
    expect(resDefault.formattedRate).toBe("66.7%");

    const res2 = calculateOpSuccessRate(ops, { precision: 2 });
    expect(res2.successRate).toBe(66.67);
    expect(res2.formattedRate).toBe("66.67%");

    const res0 = calculateOpSuccessRate(ops, { precision: 0 });
    expect(res0.successRate).toBe(67);
    expect(res0.formattedRate).toBe("67%");
  });
});
