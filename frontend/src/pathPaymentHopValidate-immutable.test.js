import { describe, expect, it } from "vitest";
import { validatePathPaymentHops } from "./pathPaymentHopValidate.js";
import { PATH_HOP_VALIDATE_ERROR } from "./pathPaymentHopValidateConstants.js";

const ISSUER_A = `G${"A".repeat(55)}`;

describe("pathPaymentHopValidate immutability guarantees", () => {
  it("does not mutate the caller's hop array or hop objects and freezes error constants", () => {
    const input = [
      { isNative: true },
      { code: " USDC ", issuer: ` ${ISSUER_A} ` },
    ];
    const snapshot = JSON.stringify(input);

    const result = validatePathPaymentHops(input);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(result.hops).not.toBe(input);
    expect(Object.isFrozen(PATH_HOP_VALIDATE_ERROR)).toBe(true);
  });
});
