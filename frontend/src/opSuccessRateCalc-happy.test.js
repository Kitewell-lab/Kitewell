import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc";

describe("opSuccessRateCalc happy path", () => {
  it("calculates success rate accurately from mixed operation outcomes", () => {
    const operations = [
      { id: "1", transaction_successful: true },
      { id: "2", transaction_successful: true },
      { id: "3", transaction_successful: true },
      { id: "4", transaction_successful: false },
    ];

    const result = calculateOpSuccessRate(operations);
    expect(result.total).toBe(4);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.successRate).toBe(75);
    expect(result.formattedRate).toBe("75.0%");
  });
});
