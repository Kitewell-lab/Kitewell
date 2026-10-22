import { describe, expect, it } from "vitest";
import { parseSep7Uri, Sep7ParseError } from "./sep7UriParse";

describe("parseSep7Uri non-string types", () => {
  it("rejects null and undefined", () => {
    expect(() => parseSep7Uri(null)).toThrow(Sep7ParseError);
    expect(() => parseSep7Uri(undefined)).toThrow(Sep7ParseError);
  });

  it("rejects numbers, booleans, and objects", () => {
    expect(() => parseSep7Uri(12345)).toThrow(Sep7ParseError);
    expect(() => parseSep7Uri(true)).toThrow(Sep7ParseError);
    expect(() => parseSep7Uri({ uri: "web+stellar:pay" })).toThrow(Sep7ParseError);
    expect(() => parseSep7Uri(["web+stellar:pay"])).toThrow(Sep7ParseError);
  });

  it("attaches INVALID_URI_TYPE code", () => {
    try {
      parseSep7Uri(null);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Sep7ParseError);
      expect(err.code).toBe("INVALID_URI_TYPE");
    }
  });
});
