import { describe, expect, it } from "vitest";
import { resolveOperationTypeLabel } from "./operationTypeLabel";

describe("resolveOperationTypeLabel path payment types", () => {
  it("resolves path_payment_strict_receive", () => {
    const res = resolveOperationTypeLabel("path_payment_strict_receive");
    expect(res.label).toBe("Path Payment (Strict Receive)");
    expect(res.iconId).toBe("git-merge");
    expect(res.isKnown).toBe(true);
  });

  it("resolves path_payment_strict_send", () => {
    const res = resolveOperationTypeLabel("path_payment_strict_send");
    expect(res.label).toBe("Path Payment (Strict Send)");
    expect(res.iconId).toBe("git-commit");
    expect(res.isKnown).toBe(true);
  });
});
