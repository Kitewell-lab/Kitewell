import { describe, expect, it } from "vitest";
import { filterDustBalances, balanceDustFilter } from "./balanceDustFilter";

describe("balanceDustFilter custom threshold formats", () => {
  it("accepts threshold as number, bigint, or options object with identical results", () => {
    const balances = [
      { asset_type: "native", balance: "10.0000000" },
      { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "1.0000000" }, // 10,000,000 stroops
      { asset_type: "credit_alphanum4", asset_code: "SMALL", balance: "0.0050000" }, // 50,000 stroops
    ];

    // threshold 100,000 stroops (0.0100000)
    const resNum = filterDustBalances(balances, 100_000);
    const resBig = filterDustBalances(balances, 100_000n);
    const resOpt = balanceDustFilter(balances, { minThresholdStroops: 100_000n });

    expect(resNum.map((b) => b.asset_code || "native")).toEqual(["native", "USDC"]);
    expect(resBig).toEqual(resNum);
    expect(resOpt).toEqual(resNum);
  });
});
