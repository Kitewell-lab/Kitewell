import { describe, expect, it } from "vitest";
import {
  resolveOperationTypeLabel,
  DEFAULT_FALLBACK_LABEL,
  DEFAULT_FALLBACK_ICON,
} from "./operationTypeLabel";

describe("resolveOperationTypeLabel empty and nullish inputs", () => {
  it("returns fallback for null and undefined", () => {
    expect(resolveOperationTypeLabel(null)).toEqual({
      label: DEFAULT_FALLBACK_LABEL,
      iconId: DEFAULT_FALLBACK_ICON,
      isKnown: false,
    });
    expect(resolveOperationTypeLabel(undefined)).toEqual({
      label: DEFAULT_FALLBACK_LABEL,
      iconId: DEFAULT_FALLBACK_ICON,
      isKnown: false,
    });
  });

  it("returns fallback for empty or whitespace-only strings", () => {
    expect(resolveOperationTypeLabel("")).toEqual({
      label: DEFAULT_FALLBACK_LABEL,
      iconId: DEFAULT_FALLBACK_ICON,
      isKnown: false,
    });
    expect(resolveOperationTypeLabel("   ")).toEqual({
      label: DEFAULT_FALLBACK_LABEL,
      iconId: DEFAULT_FALLBACK_ICON,
      isKnown: false,
    });
  });

  it("returns fallback for non-string types", () => {
    expect(resolveOperationTypeLabel(12345).isKnown).toBe(false);
    expect(resolveOperationTypeLabel({}).isKnown).toBe(false);
    expect(resolveOperationTypeLabel([]).isKnown).toBe(false);
  });
});
