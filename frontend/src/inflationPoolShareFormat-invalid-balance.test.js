import { describe, expect, it } from "vitest";
import { formatReserveRatio } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat invalid native balance", () => {
  it("throws TypeError when native balance is missing or not a valid number string", () => {
    expect(() => formatReserveRatio(undefined)).toThrow(TypeError);
    expect(() => formatReserveRatio(null)).toThrow(TypeError);
    expect(() => formatReserveRatio("")).toThrow(TypeError);
    expect(() => formatReserveRatio("abc")).toThrow(TypeError);
  });

  it("throws RangeError when native balance is negative", () => {
    expect(() => formatReserveRatio("-5.0000000")).toThrow(RangeError);
    expect(() => formatReserveRatio(-100n)).toThrow(RangeError);
  });
});
