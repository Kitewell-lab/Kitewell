import { describe, expect, it } from "vitest";
import { filterDustBalances } from "./balanceDustFilter";

describe("balanceDustFilter immutability", () => {
  it("does not mutate original balances array and returns a new array reference", () => {
    const balances = [
      { asset_type: "native", balance: "100.0000000" },
      { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "0.0000000" },
    ];
    const snapshot = JSON.parse(JSON.stringify(balances));

    const result = filterDustBalances(balances);

    expect(result).not.toBe(balances);
    expect(balances).toEqual(snapshot);
    expect(balances).toHaveLength(2);
    expect(result).toHaveLength(1);
  });
});
