import { describe, it, expect } from "vitest";

import {
  MEMO_LIMITS,
  MAX_MEMO_ID,
  MEMO_TYPES,
} from "./memoSizeEstimateConstants.js";

describe("memoSizeEstimateConstants", () => {
  it("exports frozen MEMO_LIMITS with protocol boundaries", () => {
    expect(MEMO_LIMITS.text).toBe(28);
    expect(MEMO_LIMITS.id).toBe(8);
    expect(MEMO_LIMITS.hash).toBe(32);
    expect(MEMO_LIMITS.return).toBe(32);
    expect(MEMO_LIMITS.none).toBe(0);
    expect(Object.isFrozen(MEMO_LIMITS)).toBe(true);
  });

  it("exports MAX_MEMO_ID matching uint64 max", () => {
    expect(MAX_MEMO_ID).toBe(18_446_744_073_709_551_615n);
  });

  it("exports frozen MEMO_TYPES list", () => {
    expect(MEMO_TYPES).toContain("text");
    expect(MEMO_TYPES).toContain("id");
    expect(MEMO_TYPES).toContain("hash");
    expect(MEMO_TYPES).toContain("return");
    expect(MEMO_TYPES).toContain("none");
    expect(Object.isFrozen(MEMO_TYPES)).toBe(true);
  });
});
