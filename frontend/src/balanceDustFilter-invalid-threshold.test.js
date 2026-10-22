import { describe, expect, it } from "vitest";
import { filterDustBalances } from "./balanceDustFilter";

describe("balanceDustFilter invalid threshold input", () => {
  it("throws RangeError when threshold is negative", () => {
    expect(() => filterDustBalances([], -1)).toThrow(RangeError);
    expect(() => filterDustBalances([], -1n)).toThrow("minThresholdStroops cannot be negative");
    expect(() => filterDustBalances([], { minThresholdStroops: -50 })).toThrow(RangeError);
  });

  it("throws TypeError when threshold is non-numeric string or invalid type", () => {
    expect(() => filterDustBalances([], "invalid")).toThrow(TypeError);
    expect(() => filterDustBalances([], NaN)).toThrow(TypeError);
    expect(() => filterDustBalances([], Infinity)).toThrow(TypeError);
  });
});
