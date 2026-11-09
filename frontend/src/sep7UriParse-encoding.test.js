import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse.js";
import { SEP7_URI_ERROR } from "./sep7UriParseConstants.js";

describe("sep7UriParse query percent-decoding and duplicate keys", () => {
  it("decodes percent-encoded UTF-8 values and preserves empty values", () => {
    const uri =
      "web+stellar:pay?msg=Hello%20Stellar%21%20%F0%9F%9A%80&memo=";

    expect(parseSep7Uri(uri)).toEqual({
      operation: "pay",
      params: {
        msg: "Hello Stellar! 🚀",
        memo: "",
      },
    });
  });

  it("rejects duplicate query keys and malformed query pairs", () => {
    expect(() =>
      parseSep7Uri("web+stellar:pay?amount=10&amount=20")
    ).toThrow(SEP7_URI_ERROR.DUPLICATE_PARAM);

    for (const malformed of [
      "web+stellar:pay?missing_equals",
      "web+stellar:pay?=empty_key",
      "web+stellar:pay?a=1&&b=2",
      "web+stellar:pay?msg=%E0%A4%A",
      "web+stellar:pay?__proto__=polluted",
    ]) {
      expect(() => parseSep7Uri(malformed)).toThrow(
        SEP7_URI_ERROR.MALFORMED_QUERY
      );
    }
  });
});
