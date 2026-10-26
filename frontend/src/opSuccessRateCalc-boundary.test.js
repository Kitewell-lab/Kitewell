import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

describe("opSuccessRateCalc boundary values (0% and 100%)", () => {
  it("returns 1.0 successRate when all operations succeeded", () => {
    const ops = [
      { id: "1", transaction_successful: true },
      { id: "2", transaction_successful: true },
    ];

    const result = calculateOpSuccessRate(ops);

    expect(result).toEqual({
      successRate: 1,
      successful: 2,
      failed: 0,
      total: 2,
    });
  });

  it("returns 0.0 successRate when all operations failed", () => {
    const ops = [
      { id: "1", transaction_successful: false },
      { id: "2", transaction_successful: false },
      { id: "3", transaction_successful: false },
    ];

    const result = calculateOpSuccessRate(ops);

    expect(result).toEqual({
      successRate: 0,
      successful: 0,
      failed: 3,
      total: 3,
    });
  });
});
