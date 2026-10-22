import { describe, expect, it } from "vitest";
import { resolveOperationTypeLabel } from "./operationTypeLabel";

describe("resolveOperationTypeLabel liquidity pool operations", () => {
  it("resolves liquidity_pool_deposit", () => {
    const res = resolveOperationTypeLabel("liquidity_pool_deposit");
    expect(res.label).toBe("Liquidity Pool Deposit");
    expect(res.iconId).toBe("plus-circle");
    expect(res.isKnown).toBe(true);
  });

  it("resolves liquidity_pool_withdraw", () => {
    const res = resolveOperationTypeLabel("liquidity_pool_withdraw");
    expect(res.label).toBe("Liquidity Pool Withdraw");
    expect(res.iconId).toBe("minus-circle");
    expect(res.isKnown).toBe(true);
  });
});
