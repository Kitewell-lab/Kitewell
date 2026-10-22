import { describe, expect, it } from "vitest";
import { resolveOperationTypeLabel, DEFAULT_FALLBACK_ICON } from "./operationTypeLabel";

describe("resolveOperationTypeLabel unknown fallback", () => {
  it("generates Title Case label for unlisted snake_case type", () => {
    const res = resolveOperationTypeLabel("custom_future_operation");
    expect(res.label).toBe("Custom Future Operation");
    expect(res.iconId).toBe(DEFAULT_FALLBACK_ICON);
    expect(res.isKnown).toBe(false);
  });

  it("respects autoTitleCase: false option", () => {
    const res = resolveOperationTypeLabel("custom_future_operation", {
      autoTitleCase: false,
    });
    expect(res.label).toBe("Unknown Operation");
    expect(res.iconId).toBe(DEFAULT_FALLBACK_ICON);
  });

  it("respects custom fallbackLabel and fallbackIcon options", () => {
    const res = resolveOperationTypeLabel("mystery_op", {
      fallbackLabel: "Unrecognized",
      fallbackIcon: "alert-triangle",
      autoTitleCase: false,
    });
    expect(res.label).toBe("Unrecognized");
    expect(res.iconId).toBe("alert-triangle");
  });
});
