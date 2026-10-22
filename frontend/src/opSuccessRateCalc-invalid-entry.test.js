import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc";

describe("opSuccessRateCalc invalid entries", () => {
  it("throws TypeError when an operation element is null or non-object", () => {
    expect(() => calculateOpSuccessRate([null])).toThrow("each operation must be an object");
    expect(() => calculateOpSuccessRate([undefined])).toThrow(TypeError);
    expect(() => calculateOpSuccessRate(["string_op"])).toThrow(TypeError);
    expect(() => calculateOpSuccessRate([true])).toThrow(TypeError);
  });
});
