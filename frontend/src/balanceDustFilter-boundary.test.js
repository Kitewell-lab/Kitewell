import { describe, expect, it } from "vitest";
import { filterDustBalances } from "./balanceDustFilter";

describe("balanceDustFilter threshold boundary", () => {
  it("keeps credit balance matching threshold exactly and removes balance 1 stroop below", () => {
    // 100 stroops = 0.0000100
    // 99 stroops = 0.0000099
    const threshold = 100n;
    const balances = [
      { asset_type: "credit_alphanum4", asset_code: "EXACT", balance: "0.0000100" },
      { asset_type: "credit_alphanum4", asset_code: "UNDER", balance: "0.0000099" },
      { asset_type: "credit_alphanum4", asset_code: "ABOVE", balance: "0.0000101" },
    ];

    const result = filterDustBalances(balances, threshold);
    expect(result.map((b) => b.asset_code)).toEqual(["EXACT", "ABOVE"]);
  });

  it("handles threshold of 0 stroops including zero balances", () => {
    const balances = [
      { asset_type: "credit_alphanum4", asset_code: "ZERO", balance: "0.0000000" },
    ];

    const result = filterDustBalances(balances, 0n);
    expect(result).toHaveLength(1);
    expect(result[0].asset_code).toBe("ZERO");
  });
});
