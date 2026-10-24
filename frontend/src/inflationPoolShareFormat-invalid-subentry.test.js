import { describe, expect, it } from "vitest";
import { formatReserveRatio } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat invalid subentry count", () => {
  it("throws RangeError when subentry count is negative", () => {
    expect(() => formatReserveRatio("10.0000000", "0.5000000", -1)).toThrow(RangeError);
    expect(() => formatReserveRatio("10.0000000", "0.5000000", -5n)).toThrow(RangeError);
  });

  it("throws TypeError when subentry count is not an integer", () => {
    expect(() => formatReserveRatio("10.0000000", "0.5000000", 2.5)).toThrow(TypeError);
    expect(() => formatReserveRatio("10.0000000", "0.5000000", "three")).toThrow(TypeError);
  });
});
