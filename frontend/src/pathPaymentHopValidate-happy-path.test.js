import { describe, expect, it } from "vitest";
import { validatePathHops, isValidPathHops } from "./pathPaymentHopValidate";

const VALID_ISSUER_1 = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const VALID_ISSUER_2 = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("validatePathHops happy path", () => {
  it("validates single-hop native path", () => {
    const hops = ["native"];
    expect(isValidPathHops(hops)).toBe(true);

    const validated = validatePathHops(hops);
    expect(validated).toHaveLength(1);
    expect(validated[0].canonical).toBe("native");
  });

  it("validates multi-hop path with credit assets in string and object forms", () => {
    const hops = [
      `USDC:${VALID_ISSUER_1}`,
      "XLM",
      { code: "EURT", issuer: VALID_ISSUER_2 },
    ];

    expect(isValidPathHops(hops)).toBe(true);
    const validated = validatePathHops(hops);
    expect(validated).toHaveLength(3);
    expect(validated[0].canonical).toBe(`USDC:${VALID_ISSUER_1}`);
    expect(validated[1].canonical).toBe("native");
    expect(validated[2].canonical).toBe(`EURT:${VALID_ISSUER_2}`);
  });
});
