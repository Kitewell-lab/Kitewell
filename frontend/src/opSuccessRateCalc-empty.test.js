import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

describe("opSuccessRateCalc empty array handling", () => {
  it("returns zero counts and zero successRate for empty array", () => {
    const result = calculateOpSuccessRate([]);

    expect(result).toEqual({
      successRate: 0,
      successful: 0,
      failed: 0,
      total: 0,
    });
  });
});
