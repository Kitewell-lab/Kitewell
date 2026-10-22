import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc";

describe("opSuccessRateCalc invalid operations argument", () => {
  it("throws TypeError when operations input is not an array", () => {
    expect(() => calculateOpSuccessRate(null)).toThrow(TypeError);
    expect(() => calculateOpSuccessRate(undefined)).toThrow(TypeError);
    expect(() => calculateOpSuccessRate("not_array")).toThrow(TypeError);
    expect(() => calculateOpSuccessRate(12345)).toThrow(TypeError);
    expect(() => calculateOpSuccessRate({})).toThrow("operations must be an array");
  });
});
