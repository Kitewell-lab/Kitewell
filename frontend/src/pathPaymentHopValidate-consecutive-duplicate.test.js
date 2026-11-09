import { describe, expect, it } from "vitest";
import { validatePathPaymentHops } from "./pathPaymentHopValidate.js";
import { PATH_HOP_VALIDATE_ERROR } from "./pathPaymentHopValidateConstants.js";

const ISSUER_A = `G${"A".repeat(55)}`;

describe("pathPaymentHopValidate duplicate consecutive hops", () => {
  it("rejects consecutive native hops", () => {
    expect(
      validatePathPaymentHops([{ isNative: true }, { asset_type: "native" }])
    ).toEqual({
      ok: false,
      error: PATH_HOP_VALIDATE_ERROR.DUPLICATE_CONSECUTIVE_HOP,
      index: 1,
    });
  });

  it("rejects consecutive identical issued asset hops", () => {
    expect(
      validatePathPaymentHops([
        { isNative: true },
        { code: "USDC", issuer: ISSUER_A },
        { code: "USDC", issuer: ISSUER_A },
      ])
    ).toEqual({
      ok: false,
      error: PATH_HOP_VALIDATE_ERROR.DUPLICATE_CONSECUTIVE_HOP,
      index: 2,
    });
  });
});
