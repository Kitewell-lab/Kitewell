import { describe, expect, it } from "vitest";
import { calculateOpSuccessRate } from "./opSuccessRateCalc.js";

describe("opSuccessRateCalc invalid operations input", () => {
  it("throws TypeError when operations argument is not an array", () => {
    expect(() => calculateOpSuccessRate(null)).toThrow(TypeError);
    expect(() => calculateOpSuccessRate(undefined)).toThrow(TypeError);
    expect(() => calculateOpSuccessRate("not-an-array")).toThrow(TypeError);
    expect(() => calculateOpSuccessRate(123)).toThrow(TypeError);
    expect(() => calculateOpSuccessRate({})).toThrow("Operations must be an array.");
  });
});
