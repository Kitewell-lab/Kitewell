import { describe, expect, it } from "vitest";
import { estimateMemoSize, memoSizeEstimate } from "./memoSizeEstimate";

describe("memoSizeEstimate options object invocation", () => {
  it("accepts an options object with type and value properties", () => {
    const res = estimateMemoSize({ type: "text", value: "testing" });
    expect(res.byteLength).toBe(7);
    expect(res.valid).toBe(true);

    const resAlias = memoSizeEstimate({ type: "text", value: "testing" });
    expect(resAlias).toEqual(res);
  });
});
