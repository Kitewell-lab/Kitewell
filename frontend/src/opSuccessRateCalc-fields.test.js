import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

describe("opSuccessRateCalc field compatibility", () => {
  it("resolves both transaction_successful and successful fields seamlessly", () => {
    const ops = [
      { id: "1", transaction_successful: true },
      { id: "2", successful: true },
      { id: "3", successful: false },
      { id: "4", transaction_successful: false },
      { id: "5", transaction_successful: true, successful: false }, // transaction_successful takes precedence
    ];

    const result = calculateOpSuccessRate(ops);

    expect(result).toEqual({
      successRate: 0.6,
      successful: 3,
      failed: 2,
      total: 5,
    });
  });
});
