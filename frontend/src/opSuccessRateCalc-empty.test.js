import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc";

describe("opSuccessRateCalc empty array", () => {
  it("returns zero counts and 0% rate for empty operations list", () => {
    const result = calculateOpSuccessRate([]);
    expect(result.total).toBe(0);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.successRate).toBe(0);
    expect(result.formattedRate).toBe("0%");
  });
});
