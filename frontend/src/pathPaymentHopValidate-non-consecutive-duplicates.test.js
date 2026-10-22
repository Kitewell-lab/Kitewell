import { describe, expect, it } from "vitest";
import { checkPathHops, validatePathHops } from "./pathPaymentHopValidate";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("validatePathHops non-consecutive duplicates", () => {
  it("permits the same asset appearing in non-consecutive positions", () => {
    // E.g., Path: USDC -> XLM -> USDC (arbitrage / conversion cycle)
    const hops = [
      `USDC:${ISSUER}`,
      "native",
      `USDC:${ISSUER}`,
    ];

    const res = checkPathHops(hops);
    expect(res.ok).toBe(true);
    expect(res.hopCount).toBe(3);

    const validated = validatePathHops(hops);
    expect(validated).toHaveLength(3);
    expect(validated[0].canonical).toBe(`USDC:${ISSUER}`);
    expect(validated[1].canonical).toBe("native");
    expect(validated[2].canonical).toBe(`USDC:${ISSUER}`);
  });
});
