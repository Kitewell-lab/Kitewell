import { describe, expect, it } from "vitest";
import { formatTxHash } from "./txHashFormat";

const VALID_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("formatTxHash invalid lengths handling", () => {
  it("throws RangeError on negative prefixLength", () => {
    expect(() => formatTxHash(VALID_HASH, -1, 6)).toThrow(RangeError);
    expect(() => formatTxHash(VALID_HASH, { prefixLength: -5 })).toThrow(RangeError);
  });

  it("throws RangeError on negative suffixLength", () => {
    expect(() => formatTxHash(VALID_HASH, 6, -2)).toThrow(RangeError);
    expect(() => formatTxHash(VALID_HASH, { suffixLength: -3 })).toThrow(RangeError);
  });

  it("throws TypeError on non-finite length", () => {
    expect(() => formatTxHash(VALID_HASH, NaN, 6)).toThrow(TypeError);
    expect(() => formatTxHash(VALID_HASH, 6, Infinity)).toThrow(TypeError);
    expect(() => formatTxHash(VALID_HASH, "not-a-number", 6)).toThrow(TypeError);
  });
});
