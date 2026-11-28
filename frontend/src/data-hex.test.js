import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { formatDataValueAsHex, MAX_DATA_VALUE_BYTES, parseHexDataValue } from "./dataHex";

describe("parseHexDataValue", () => {
  it("stores the bytes, not the hex characters", () => {
    const bytes = parseHexDataValue("00ff10Ab");
    expect(Array.from(bytes)).toEqual([0, 255, 16, 171]);
  });

  it("accepts an empty value and exactly 64 bytes", () => {
    expect(parseHexDataValue("")).toHaveLength(0);
    expect(parseHexDataValue("ab".repeat(MAX_DATA_VALUE_BYTES))).toHaveLength(64);
  });

  it("refuses an odd number of characters", () => {
    expect(() => parseHexDataValue("abc")).toThrow(/even number/);
  });

  it("refuses more than 64 bytes before signing", () => {
    expect(() => parseHexDataValue("ab".repeat(65))).toThrow(/64 bytes or fewer/);
  });

  it("refuses non-hex characters", () => {
    expect(() => parseHexDataValue("zz")).toThrow(/0-9 and a-f/);
    expect(() => parseHexDataValue("0x12")).toThrow(/0-9 and a-f/);
  });
});

describe("hex round trip", () => {
  it("reads back the same hex the user entered", () => {
    const entered = "0001feff80deadbeef";
    const bytes = parseHexDataValue(entered);
    // Horizon returns manage-data values as base64.
    const fromHorizon = Buffer.from(bytes).toString("base64");
    expect(formatDataValueAsHex(fromHorizon)).toBe(entered);
    expect(formatDataValueAsHex(bytes)).toBe(entered);
  });

  it("keeps hex that is also valid text as hex", () => {
    // 41424344 is the text "ABCD"; hex mode must still read back as hex.
    const bytes = parseHexDataValue("41424344");
    expect(formatDataValueAsHex(Buffer.from(bytes).toString("base64"))).toBe("41424344");
  });

  it("returns an empty string for a missing value", () => {
    expect(formatDataValueAsHex(null)).toBe("");
  });
});
