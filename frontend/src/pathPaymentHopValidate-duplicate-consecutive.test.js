import { describe, expect, it } from "vitest";
import { checkPathHops, validatePathHops, PathPaymentHopValidationError } from "./pathPaymentHopValidate";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("validatePathHops duplicate consecutive hops", () => {
  it("rejects consecutive native hops", () => {
    const res = checkPathHops(["native", "XLM"]);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("DUPLICATE_CONSECUTIVE_HOPS");

    expect(() => validatePathHops(["native", "native"])).toThrow(PathPaymentHopValidationError);
  });

  it("rejects consecutive credit asset hops matching between string and object forms", () => {
    const hops = [
      `USDC:${ISSUER}`,
      { code: "USDC", issuer: ISSUER },
    ];

    const res = checkPathHops(hops);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("DUPLICATE_CONSECUTIVE_HOPS");
  });
});
