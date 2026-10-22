import { describe, expect, it } from "vitest";
import { filterDustBalances } from "./balanceDustFilter";

describe("balanceDustFilter empty balances", () => {
  it("returns a new empty array when balances is empty", () => {
    expect(filterDustBalances([])).toEqual([]);
    expect(filterDustBalances([], 1000n)).toEqual([]);
  });
});
