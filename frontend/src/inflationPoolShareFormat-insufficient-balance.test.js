import { describe, expect, it } from "vitest";
import { formatReserveRatio } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat insufficient balance", () => {
  it("clamps available balance to zero when native balance is strictly below required reserves", () => {
    // 1.5 XLM balance, 0.5 base reserve, 2 subentries
    // usedReserves = (2 + 2) * 0.5 = 2.0 XLM
    // availableBalance = max(0, 1.5 - 2.0) = 0 XLM
    const result = formatReserveRatio("1.5000000", "0.5000000", 2);
    expect(result.usedReserves).toBe("2.0000000");
    expect(result.availableBalance).toBe("0.0000000");
    expect(result.availableBalanceStroops).toBe(0n);
  });
});
