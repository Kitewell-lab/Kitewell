import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

describe("opSuccessRateCalc immutability", () => {
  it("does not mutate the input array or its record objects", () => {
    const original = Object.freeze([
      Object.freeze({ id: "op_1", transaction_successful: true }),
      Object.freeze({ id: "op_2", transaction_successful: false }),
    ]);

    expect(() => calculateOpSuccessRate(original)).not.toThrow();

    const mutableOps = [
      { id: "op_3", transaction_successful: true },
    ];
    calculateOpSuccessRate(mutableOps);

    expect(mutableOps).toEqual([{ id: "op_3", transaction_successful: true }]);
  });
});
