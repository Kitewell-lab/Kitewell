import { describe, expect, it } from "vitest";
import {
  checkPathHops,
  validatePathHops,
  MAX_PATH_HOPS,
  PathPaymentHopValidationError,
} from "./pathPaymentHopValidate";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("validatePathHops maximum hops boundary", () => {
  it("accepts maximum allowed 5 hops", () => {
    const hops = [
      `A:${ISSUER}`,
      "native",
      `B:${ISSUER}`,
      "native",
      `C:${ISSUER}`,
    ];
    expect(hops).toHaveLength(MAX_PATH_HOPS);

    const res = checkPathHops(hops);
    expect(res.ok).toBe(true);
    expect(res.hopCount).toBe(5);
  });

  it("rejects 6 hops with MAX_HOPS_EXCEEDED error", () => {
    const hops = [
      `A:${ISSUER}`,
      "native",
      `B:${ISSUER}`,
      "native",
      `C:${ISSUER}`,
      "native",
    ];
    expect(hops).toHaveLength(6);

    const res = checkPathHops(hops);
    expect(res.ok).toBe(false);
    expect(res.code).toBe("MAX_HOPS_EXCEEDED");

    expect(() => validatePathHops(hops)).toThrow(PathPaymentHopValidationError);
  });
});
