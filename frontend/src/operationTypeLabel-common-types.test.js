import { describe, expect, it } from "vitest";
import { resolveOperationTypeLabel } from "./operationTypeLabel";

describe("resolveOperationTypeLabel common types", () => {
  it("resolves payment operation", () => {
    const res = resolveOperationTypeLabel("payment");
    expect(res).toEqual({
      label: "Payment",
      iconId: "arrow-right",
      isKnown: true,
    });
  });

  it("resolves create_account operation", () => {
    const res = resolveOperationTypeLabel("create_account");
    expect(res).toEqual({
      label: "Create Account",
      iconId: "user-plus",
      isKnown: true,
    });
  });

  it("resolves change_trust and manage_data operations", () => {
    expect(resolveOperationTypeLabel("change_trust")).toEqual({
      label: "Change Trust",
      iconId: "link",
      isKnown: true,
    });
    expect(resolveOperationTypeLabel("manage_data")).toEqual({
      label: "Manage Data",
      iconId: "database",
      isKnown: true,
    });
  });
});
