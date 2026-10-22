import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate, isOperationSuccessful } from "./opSuccessRateCalc";

describe("opSuccessRateCalc field compatibility", () => {
  it("recognizes both transaction_successful and successful fields", () => {
    expect(isOperationSuccessful({ transaction_successful: true })).toBe(true);
    expect(isOperationSuccessful({ successful: true })).toBe(true);
    expect(isOperationSuccessful({ transaction_successful: false })).toBe(false);
    expect(isOperationSuccessful({})).toBe(false);

    const mixed = [
      { id: "1", transaction_successful: true },
      { id: "2", successful: true },
      { id: "3", successful: false },
    ];
    const res = calculateOpSuccessRate(mixed);
    expect(res.successful).toBe(2);
    expect(res.total).toBe(3);
  });
});
