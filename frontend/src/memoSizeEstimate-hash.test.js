import { describe, expect, it } from "vitest";
import { estimateMemoSize } from "./memoSizeEstimate";

describe("memoSizeEstimate hash and return memo", () => {
  it("validates 64-character hex strings as 32-byte memos", () => {
    const validHex = "a".repeat(64);
    const res = estimateMemoSize("hash", validHex);
    expect(res.byteLength).toBe(32);
    expect(res.maxBytes).toBe(32);
    expect(res.valid).toBe(true);
    expect(res.remainingBytes).toBe(0);

    const resRet = estimateMemoSize("return", validHex);
    expect(resRet.valid).toBe(true);
  });

  it("validates 32-byte Uint8Array buffers", () => {
    const uint8 = new Uint8Array(32);
    const res = estimateMemoSize("hash", uint8);
    expect(res.byteLength).toBe(32);
    expect(res.valid).toBe(true);
  });

  it("marks invalid length hex or non-hex as invalid", () => {
    const shortHex = "deadbeef";
    const res = estimateMemoSize("hash", shortHex);
    expect(res.byteLength).toBe(4);
    expect(res.valid).toBe(false);

    const invalidCharHex = "g".repeat(64);
    const resChar = estimateMemoSize("hash", invalidCharHex);
    expect(resChar.valid).toBe(false);
  });
});
