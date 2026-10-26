import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

describe("opSuccessRateCalc happy path", () => {
  it("calculates correct successRate and counts for mixed operations", () => {
    const ops = [
      { id: "1", transaction_successful: true },
      { id: "2", transaction_successful: false },
      { id: "3", transaction_successful: true },
      { id: "4", transaction_successful: true },
    ];

    const result = calculateOpSuccessRate(ops);

    expect(result).toEqual({
      successRate: 0.75,
      successful: 3,
      failed: 1,
      total: 4,
    });
  });
});
