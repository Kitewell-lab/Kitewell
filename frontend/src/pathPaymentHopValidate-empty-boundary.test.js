import { describe, expect, it } from "vitest";
import { validatePathPaymentHops } from "./pathPaymentHopValidate.js";
import { MAX_PATH_PAYMENT_HOPS } from "./pathPaymentHopValidateConstants.js";

const ISSUER_A = `G${"A".repeat(55)}`;

describe("pathPaymentHopValidate 0-hop and 5-hop boundaries", () => {
  it("accepts an empty array (0 intermediate hops)", () => {
    expect(validatePathPaymentHops([])).toEqual({
      ok: true,
      hops: [],
    });
  });

  it("accepts exactly 5 intermediate hops (protocol maximum)", () => {
    const fiveHops = [
      { isNative: true },
      { code: "A1", issuer: ISSUER_A },
      { code: "A2", issuer: ISSUER_A },
      { code: "A3", issuer: ISSUER_A },
      { code: "A4", issuer: ISSUER_A },
    ];

    expect(fiveHops).toHaveLength(MAX_PATH_PAYMENT_HOPS);
    const result = validatePathPaymentHops(fiveHops);
    expect(result.ok).toBe(true);
    expect(result.hops).toHaveLength(MAX_PATH_PAYMENT_HOPS);
  });
});
