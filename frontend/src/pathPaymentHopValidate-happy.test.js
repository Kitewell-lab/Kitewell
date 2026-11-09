import { describe, expect, it } from "vitest";
import { validatePathPaymentHops } from "./pathPaymentHopValidate.js";

const ISSUER_A = `G${"A".repeat(55)}`;
const ISSUER_B = `G${"B".repeat(55)}`;

describe("pathPaymentHopValidate happy path", () => {
  it("accepts a valid sequence of native, UI descriptor, and Horizon-shaped hops", () => {
    const result = validatePathPaymentHops([
      { isNative: true },
      { code: "USDC", issuer: ISSUER_A },
      {
        asset_type: "credit_alphanum4",
        asset_code: "EURC",
        asset_issuer: ISSUER_B,
      },
    ]);

    expect(result).toEqual({
      ok: true,
      hops: [
        { isNative: true },
        { isNative: false, code: "USDC", issuer: ISSUER_A },
        { isNative: false, code: "EURC", issuer: ISSUER_B },
      ],
    });
  });

  it("allows the same assetcode when issuers differ or when hops are non-consecutive", () => {
    const result = validatePathPaymentHops([
      { code: "USDC", issuer: ISSUER_A },
      { code: "USDC", issuer: ISSUER_B },
      { code: "USDC", issuer: ISSUER_A },
    ]);

    expect(result.ok).toBe(true);
    expect(result.hops).toHaveLength(3);
  });
});
