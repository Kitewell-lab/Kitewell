import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse.js";

describe("sep7UriParse pay operation happy path", () => {
  it("parses a web+stellar:pay URI with destination, amount, asset, and memo", () => {
    const uri =
      "web+stellar:pay?destination=GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF&amount=25.5&asset_code=USDC&memo=Rent&memo_type=MEMO_TEXT";

    expect(parseSep7Uri(uri)).toEqual({
      operation: "pay",
      params: {
        destination: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        amount: "25.5",
        asset_code: "USDC",
        memo: "Rent",
        memo_type: "MEMO_TEXT",
      },
    });
  });

  it("parses a bare web+stellar:pay URI without query parameters", () => {
    expect(parseSep7Uri("web+stellar:pay")).toEqual({
      operation: "pay",
      params: {},
    });
  });
});
