import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse.js";

describe("sep7UriParse tx operation happy path", () => {
  it("parses a web+stellar:tx URI with xdr, callback, and pubkey parameters", () => {
    const uri =
      "web+stellar:tx?xdr=AAAAAgAAAABex3%2B%3D&callback=url%3Ahttps%3A%2F%2Fexample.com%2Fcb&pubkey=GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

    expect(parseSep7Uri(uri)).toEqual({
      operation: "tx",
      params: {
        xdr: "AAAAAgAAAABex3+=",
        callback: "url:https://example.com/cb",
        pubkey: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      },
    });
  });

  it("normalizes uppercase scheme and operation names to lowercase", () => {
    expect(parseSep7Uri("  WEB+STELLAR:TX?xdr=AAAA  ")).toEqual({
      operation: "tx",
      params: { xdr: "AAAA" },
    });
  });
});
