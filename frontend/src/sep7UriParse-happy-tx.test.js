import { describe, expect, it } from "vitest";
import { parseSep7Uri } from "./sep7UriParse";

describe("parseSep7Uri tx operation", () => {
  it("parses tx URI with xdr base64 string", () => {
    const fakeXdr = "AAAAAGXqj8...";
    const uri = `web+stellar:tx?xdr=${encodeURIComponent(fakeXdr)}&pubkey=GBBB12345`;
    const res = parseSep7Uri(uri);

    expect(res.operation).toBe("tx");
    expect(res.params.xdr).toBe(fakeXdr);
    expect(res.params.pubkey).toBe("GBBB12345");
  });

  it("parses tx URI with callback and network_passphrase", () => {
    const uri =
      "web+stellar:tx?xdr=abc123xyz&callback=url%3Ahttps%3A%2F%2Fexample.com%2Fcb&network_passphrase=Test+SDF+Network";
    const res = parseSep7Uri(uri);

    expect(res.operation).toBe("tx");
    expect(res.params.xdr).toBe("abc123xyz");
    expect(res.params.callback).toBe("url:https://example.com/cb");
    expect(res.params.network_passphrase).toBe("Test SDF Network");
  });
});
