import { describe, expect, it } from "vitest";
import { validatePathPaymentHops } from "./pathPaymentHopValidate.js";
import { PATH_HOP_VALIDATE_ERROR } from "./pathPaymentHopValidateConstants.js";

const ISSUER_A = `G${"A".repeat(55)}`;

describe("pathPaymentHopValidate max length exceeded", () => {
  it("rejects 6 or more intermediate hops", () => {
    const sixHops = [
      { isNative: true },
      { code: "A1", issuer: ISSUER_A },
      { code: "A2", issuer: ISSUER_A },
      { code: "A3", issuer: ISSUER_A },
      { code: "A4", issuer: ISSUER_A },
      { code: "A5", issuer: ISSUER_A },
    ];

    expect(validatePathPaymentHops(sixHops)).toEqual({
      ok: false,
      error: PATH_HOP_VALIDATE_ERROR.TOO_MANY_HOPS,
    });
  });
});
