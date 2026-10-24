import { describe, expect, it } from "vitest";
import { formatReserveRatio } from "./inflationPoolShareFormat";

describe("inflationPoolShareFormat boundary condition", () => {
  it("yields exact zero available balance when native balance equals used reserves", () => {
    // 2.0 XLM balance, 0.5 base reserve, 2 subentries -> usedReserves = 2.0 XLM, available = 0
    const result = formatReserveRatio("2.0000000", "0.5000000", 2);
    expect(result.usedReserves).toBe("2.0000000");
    expect(result.availableBalance).toBe("0.0000000");
    expect(result.availableBalanceStroops).toBe(0n);
  });

  it("yields exactly 1 stroop available balance when 1 stroop above used reserves", () => {
    const result = formatReserveRatio("2.0000001", "0.5000000", 2);
    expect(result.usedReserves).toBe("2.0000000");
    expect(result.availableBalance).toBe("0.0000001");
    expect(result.availableBalanceStroops).toBe(1n);
  });
});
