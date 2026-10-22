import { describe, expect, it } from "vitest";
import { parseSep7Uri, Sep7ParseError } from "./sep7UriParse";

describe("parseSep7Uri invalid schemes", () => {
  it("rejects non-web+stellar schemes like https or stellar", () => {
    expect(() => parseSep7Uri("https://example.com/pay")).toThrow(Sep7ParseError);
    expect(() => parseSep7Uri("stellar:pay?destination=G123")).toThrow(Sep7ParseError);
    expect(() => parseSep7Uri("ftp:pay")).toThrow(Sep7ParseError);
  });

  it("rejects URIs missing a colon scheme delimiter", () => {
    expect(() => parseSep7Uri("web+stellar-pay?destination=G123")).toThrow(Sep7ParseError);
  });

  it("attaches INVALID_SCHEME error code", () => {
    try {
      parseSep7Uri("mailto:someone@stellar.org");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Sep7ParseError);
      expect(err.code).toBe("INVALID_SCHEME");
    }
  });
});
