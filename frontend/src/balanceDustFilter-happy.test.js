import { describe, expect, it } from "vitest";
import { filterDustBalances } from "./balanceDustFilter";

describe("balanceDustFilter happy path", () => {
  it("filters out zero and sub-threshold credit balances while keeping non-dust balances", () => {
    const balances = [
      { asset_type: "native", balance: "10.0000000" },
      { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "50.0000000" },
      { asset_type: "credit_alphanum4", asset_code: "DUST1", balance: "0.0000000" },
      { asset_type: "credit_alphanum12", asset_code: "LONGDUST", balance: "0.0000000" },
    ];

    const result = filterDustBalances(balances);
    expect(result).toHaveLength(2);
    expect(result[0].asset_type).toBe("native");
    expect(result[1].asset_code).toBe("USDC");
  });
});
