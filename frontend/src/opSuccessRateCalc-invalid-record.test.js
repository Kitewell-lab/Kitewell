import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

describe("opSuccessRateCalc invalid record validation", () => {
  it("throws TypeError when record is null or not an object", () => {
    expect(() => calculateOpSuccessRate([null])).toThrow("Operation record must be a non-null object.");
    expect(() => calculateOpSuccessRate(["string-op"])).toThrow("Operation record must be a non-null object.");
  });

  it("throws TypeError in strict mode when neither boolean flag is provided", () => {
    expect(() => calculateOpSuccessRate([{ id: "1" }])).toThrow(
      "Operation record must contain a boolean 'transaction_successful' or 'successful' field."
    );

    expect(() => calculateOpSuccessRate([{ id: "1", transaction_successful: "true" }])).toThrow(
      TypeError
    );
  });

  it("handles non-boolean fields gracefully when strict mode is false", () => {
    const ops = [
      { id: "1", transaction_successful: true },
      { id: "2" }, // treated as false in non-strict
    ];

    const result = calculateOpSuccessRate(ops, { strict: false });
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.successRate).toBe(0.5);
  });
});
