import { describe, expect, it } from "vitest";
import { resolveOperationTypeLabel } from "./operationTypeLabel";

describe("resolveOperationTypeLabel soroban operations", () => {
  it("resolves invoke_host_function", () => {
    const res = resolveOperationTypeLabel("invoke_host_function");
    expect(res.label).toBe("Invoke Host Function");
    expect(res.iconId).toBe("cpu");
    expect(res.isKnown).toBe(true);
  });

  it("resolves extend_footprint_ttl and restore_footprint", () => {
    expect(resolveOperationTypeLabel("extend_footprint_ttl")).toEqual({
      label: "Extend Footprint TTL",
      iconId: "calendar",
      isKnown: true,
    });
    expect(resolveOperationTypeLabel("restore_footprint")).toEqual({
      label: "Restore Footprint",
      iconId: "refresh-cw",
      isKnown: true,
    });
  });
});
