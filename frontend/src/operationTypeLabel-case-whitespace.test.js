import { describe, expect, it } from "vitest";
import { resolveOperationTypeLabel } from "./operationTypeLabel";

describe("resolveOperationTypeLabel case and whitespace tolerance", () => {
  it("normalizes uppercase and mixed-case types", () => {
    expect(resolveOperationTypeLabel("PAYMENT").label).toBe("Payment");
    expect(resolveOperationTypeLabel("Create_Account").label).toBe("Create Account");
    expect(resolveOperationTypeLabel("PATH_PAYMENT_STRICT_SEND").iconId).toBe("git-commit");
  });

  it("trims surrounding whitespace from operation types", () => {
    const res = resolveOperationTypeLabel("  payment  \n");
    expect(res.label).toBe("Payment");
    expect(res.isKnown).toBe(true);
  });
});
