import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc";

describe("opSuccessRateCalc 100% success", () => {
  it("yields 100% success rate when all operations succeed", () => {
    const operations = [
      { id: "1", transaction_successful: true },
      { id: "2", transaction_successful: true },
    ];

    const result = calculateOpSuccessRate(operations);
    expect(result.total).toBe(2);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.successRate).toBe(100);
    expect(result.formattedRate).toBe("100.0%");
  });
});
