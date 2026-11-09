import { describe, expect, it } from "vitest";
import { validatePathPaymentHops } from "./pathPaymentHopValidate.js";
import { PATH_HOP_VALIDATE_ERROR } from "./pathPaymentHopValidateConstants.js";

const ISSUER_A = `G${"A".repeat(55)}`;

describe("pathPaymentHopValidate malformed hop descriptors", () => {
  it("rejects null, primitive, empty, or malformed hop entries with their index", () => {
    for (const badHop of [
      null,
      "XLM",
      {},
      { isNative: false, code: "", issuer: ISSUER_A },
      { isNative: false, code: "TOOLONGASSETCODE", issuer: ISSUER_A },
      { isNative: false, code: "USDC", issuer: "INVALID_ISSUER" },
      { asset_type: "liquidity_pool_shares" },
    ]) {
      expect(validatePathPaymentHops([{ isNative: true }, badHop])).toEqual({
        ok: false,
        error: PATH_HOP_VALIDATE_ERROR.INVALID_HOP,
        index: 1,
      });
    }
  });
});
