import { describe, expect, it } from "vitest";
import { filterDustBalances } from "./balanceDustFilter";

describe("balanceDustFilter invalid balances input", () => {
  it("throws TypeError when balances argument is not an array", () => {
    expect(() => filterDustBalances(null)).toThrow(TypeError);
    expect(() => filterDustBalances(undefined)).toThrow(TypeError);
    expect(() => filterDustBalances("not an array")).toThrow(TypeError);
    expect(() => filterDustBalances(12345)).toThrow(TypeError);
    expect(() => filterDustBalances({})).toThrow("balances must be an array");
  });
});
