import { describe, expect, it } from "vitest";
import { formatDataValue, isBinaryDataValue } from "./stellar";

const toBase64 = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));

describe("formatDataValue", () => {
  it("renders valid UTF-8 text as text", () => {
    const value = toBase64(new TextEncoder().encode("hello"));
    expect(formatDataValue(value)).toBe("hello");
    expect(isBinaryDataValue(value)).toBe(false);
  });

  it("renders a binary fixture as labeled hex", () => {
    const value = toBase64([0xff, 0xfe, 0x00]);
    expect(formatDataValue(value)).toBe("fffe00");
    expect(isBinaryDataValue(value)).toBe(true);
  });

  it("leaves an empty value empty", () => {
    expect(formatDataValue("")).toBe("");
    expect(formatDataValue(null)).toBe("");
    expect(isBinaryDataValue("")).toBe(false);
  });
});
