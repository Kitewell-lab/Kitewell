import { describe, expect, it } from "vitest";
import { formatReserveRatio } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat invalid base reserve", () => {
  it("throws RangeError when base reserve is negative", () => {
    expect(() => formatReserveRatio("10.0000000", "-0.5000000", 0)).toThrow(RangeError);
    expect(() => formatReserveRatio("10.0000000", -500n, 0)).toThrow(RangeError);
  });

  it("throws TypeError when base reserve format is invalid", () => {
    expect(() => formatReserveRatio("10.0000000", "not_a_number", 0)).toThrow(TypeError);
    expect(() => formatReserveRatio("10.0000000", null, 0)).toThrow(TypeError);
  });
});
