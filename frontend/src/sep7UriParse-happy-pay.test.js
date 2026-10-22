import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse";

describe("parseSep7Uri pay operation", () => {
  it("parses minimal pay URI", () => {
    const uri = "web+stellar:pay?destination=GABC1234567890";
    const res = parseSep7Uri(uri);

    expect(res.operation).toBe("pay");
    expect(res.params).toEqual({
      destination: "GABC1234567890",
    });
    expect(res.raw).toBe(uri);
  });

  it("parses full pay URI with amount, asset, and memo", () => {
    const uri =
      "web+stellar:pay?destination=GABC1234567890&amount=100.5&asset_code=USDC&asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN&memo=invoice123&memo_type=MEMO_TEXT";
    const res = parseSep7Uri(uri);

    expect(res.operation).toBe("pay");
    expect(res.params.destination).toBe("GABC1234567890");
    expect(res.params.amount).toBe("100.5");
    expect(res.params.asset_code).toBe("USDC");
    expect(res.params.asset_issuer).toBe("GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN");
    expect(res.params.memo).toBe("invoice123");
    expect(res.params.memo_type).toBe("MEMO_TEXT");
  });

  it("handles pay URI without query parameters", () => {
    const uri = "web+stellar:pay";
    const res = parseSep7Uri(uri);

    expect(res.operation).toBe("pay");
    expect(res.params).toEqual({});
  });
});
