import { describe, expect, it } from "vitest";
import {
  assertPathPaymentHops,
  validatePathPaymentHops,
} from "./pathPaymentHopValidate.js";
import { PATH_HOP_VALIDATE_ERROR } from "./pathPaymentHopValidateConstants.js";

describe("pathPaymentHopValidate non-array inputs", () => {
  it("rejects non-array inputs safely in validatePathPaymentHops and throws TypeError in assertPathPaymentHops", () => {
    for (const invalid of [null, undefined, "XLM", 123, true, { isNative: true }]) {
      expect(validatePathPaymentHops(invalid)).toEqual({
        ok: false,
        error: PATH_HOP_VALIDATE_ERROR.NOT_ARRAY,
      });
      expect(() => assertPathPaymentHops(invalid)).toThrow(TypeError);
    }
  });
});
