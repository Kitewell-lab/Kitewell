import { describe, expect, it } from "vitest";
import { filterDustBalances } from "./balanceDustFilter";

describe("balanceDustFilter native XLM retention", () => {
  it("always keeps native XLM balance even if balance is zero or below high thresholds", () => {
    const balances = [
      { asset_type: "native", balance: "0.0000000" },
      { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "0.0000000" },
    ];

    // High threshold: 1,000,000,000 stroops (100 XLM)
    const result = filterDustBalances(balances, 1_000_000_000n);
    expect(result).toHaveLength(1);
    expect(result[0].asset_type).toBe("native");
    expect(result[0].balance).toBe("0.0000000");
  });

  it("keeps native XLM when balance is 1 stroop with a high threshold", () => {
    const balances = [
      { asset_type: "native", balance: "0.0000001" },
      { asset_type: "credit_alphanum4", asset_code: "FOO", balance: "0.0000001" },
    ];

    const result = filterDustBalances(balances, 1000n);
    expect(result).toHaveLength(1);
    expect(result[0].asset_type).toBe("native");
  });
});
