import { describe, expect, it } from "vitest";
import { checkPathHops, validatePathHops, PathPaymentHopValidationError } from "./pathPaymentHopValidate";

describe("validatePathHops non-array input", () => {
  it("rejects non-array arguments with INVALID_HOPS_ARRAY error", () => {
    expect(checkPathHops(null).code).toBe("INVALID_HOPS_ARRAY");
    expect(checkPathHops(undefined).code).toBe("INVALID_HOPS_ARRAY");
    expect(checkPathHops("native").code).toBe("INVALID_HOPS_ARRAY");
    expect(checkPathHops(42).code).toBe("INVALID_HOPS_ARRAY");
    expect(checkPathHops({ hops: [] }).code).toBe("INVALID_HOPS_ARRAY");
  });

  it("throws PathPaymentHopValidationError on validatePathHops with non-array input", () => {
    expect(() => validatePathHops("native")).toThrow(PathPaymentHopValidationError);
  });
});
