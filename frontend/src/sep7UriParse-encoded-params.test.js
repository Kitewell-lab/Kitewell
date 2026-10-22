import { describe, expect, it } from "vitest";
import { parseSep7Uri, Sep7ParseError } from "./sep7UriParse";

describe("parseSep7Uri encoded params and special characters", () => {
  it("decodes percent-encoded characters and spaces correctly", () => {
    const uri = "web+stellar:pay?destination=GABC&memo=Coffee%20%26%20Donuts&msg=Hello+World";
    const res = parseSep7Uri(uri);

    expect(res.params.memo).toBe("Coffee & Donuts");
    expect(res.params.msg).toBe("Hello World");
  });

  it("handles UTF-8 multibyte characters in parameters", () => {
    const encoded = encodeURIComponent("付款测试");
    const uri = `web+stellar:pay?destination=GABC&msg=${encoded}`;
    const res = parseSep7Uri(uri);

    expect(res.params.msg).toBe("付款测试");
  });

  it("throws MALFORMED_URI_ENCODING when decoding invalid percent encoding", () => {
    expect(() => parseSep7Uri("web+stellar:pay?destination=%E0%A4%A")).toThrow(Sep7ParseError);

    try {
      parseSep7Uri("web+stellar:pay?destination=%E0%A4%A");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Sep7ParseError);
      expect(err.code).toBe("MALFORMED_URI_ENCODING");
    }
  });
});
