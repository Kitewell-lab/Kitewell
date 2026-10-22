import { describe, expect, it } from "vitest";
import {
  balanceToStroops,
  stroopsToBalance,
  STROOPS_PER_UNIT,
  MAX_DECIMAL_PLACES,
} from "./percentageChangeCalc";

describe("percentageChangeCalc conversion helpers", () => {
  it("converts amounts to BigInt stroops correctly", () => {
    expect(balanceToStroops("1")).toBe(10_000_000n);
    expect(balanceToStroops("0.5")).toBe(5_000_000n);
    expect(balanceToStroops("0.0000001")).toBe(1n);
    expect(balanceToStroops(100n)).toBe(100n);
  });

  it("converts stroops to decimal strings correctly", () => {
    expect(stroopsToBalance(10_000_000n)).toBe("1");
    expect(stroopsToBalance(5_000_000n)).toBe("0.5");
    expect(stroopsToBalance(1n)).toBe("0.0000001");
    expect(stroopsToBalance(-10_000_000n)).toBe("-1");
  });

  it("exports correct precision constants", () => {
    expect(STROOPS_PER_UNIT).toBe(10_000_000n);
    expect(MAX_DECIMAL_PLACES).toBe(7);
  });
});
