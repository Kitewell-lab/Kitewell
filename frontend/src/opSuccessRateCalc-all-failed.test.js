import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc";

describe("opSuccessRateCalc 0% success", () => {
  it("yields 0% success rate when all operations fail", () => {
    const operations = [
      { id: "1", transaction_successful: false },
      { id: "2", transaction_successful: false },
    ];

    const result = calculateOpSuccessRate(operations);
    expect(result.total).toBe(2);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.successRate).toBe(0);
    expect(result.formattedRate).toBe("0.0%");
  });
});
