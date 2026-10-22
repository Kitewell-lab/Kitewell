import { describe, expect, it } from "vitest";
import { formatReserveRatio } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat happy path", () => {
  it("formats reserve ratio for normal balance and subentries", () => {
    // 10 XLM balance, 0.5 base reserve, 3 subentries
    // usedReserves = (2 + 3) * 0.5 = 2.5 XLM
    // availableBalance = 10 - 2.5 = 7.5 XLM
    const result = formatReserveRatio("10.0000000", "0.5000000", 3);
    expect(result.usedReserves).toBe("2.5000000");
    expect(result.availableBalance).toBe("7.5000000");
    expect(result.usedReservesStroops).toBe(25_000_000n);
    expect(result.availableBalanceStroops).toBe(75_000_000n);
  });
});
