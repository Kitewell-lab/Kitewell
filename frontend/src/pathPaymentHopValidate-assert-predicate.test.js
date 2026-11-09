import { describe, expect, it } from "vitest";
import {
  assertPathPaymentHops,
  isValidPathPaymentHops,
} from "./pathPaymentHopValidate.js";
import { PATH_HOP_VALIDATE_ERROR } from "./pathPaymentHopValidateConstants.js";

const ISSUER_A = `G${"A".repeat(55)}`;

describe("pathPaymentHopValidate assertPathPaymentHops and isValidPathPaymentHops", () => {
  it("assertPathPaymentHops returns normalized hops or throws Error on invalid hop list", () => {
    expect(
      assertPathPaymentHops([
        { isNative: () => false, getCode: () => "USDC", getIssuer: () => ISSUER_A },
      ])
    ).toEqual([{ isNative: false, code: "USDC", issuer: ISSUER_A }]);

    expect(() =>
      assertPathPaymentHops([{ isNative: true }, { isNative: true }])
    ).toThrow(PATH_HOP_VALIDATE_ERROR.DUPLICATE_CONSECUTIVE_HOP);
  });

  it("isValidPathPaymentHops returns boolean without throwing", () => {
    expect(isValidPathPaymentHops([])).toBe(true);
    expect(isValidPathPaymentHops([{ isNative: true }])).toBe(true);
    expect(isValidPathPaymentHops(null)).toBe(false);
  });
});
