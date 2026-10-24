import { describe, expect, it } from "vitest";
import { estimateMemoSize } from "./memoSizeEstimate";

describe("memoSizeEstimate invalid memo type", () => {
  it("throws TypeError when type is missing or unknown", () => {
    expect(() => estimateMemoSize("unsupported_type")).toThrow(TypeError);
    expect(() => estimateMemoSize(null)).toThrow(TypeError);
    expect(() => estimateMemoSize(123)).toThrow(TypeError);
  });
});
