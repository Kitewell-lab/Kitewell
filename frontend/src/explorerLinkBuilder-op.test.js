import { describe, expect, it } from "vitest";
import { buildExplorerLink } from "./explorerLinkBuilder";

describe("explorerLinkBuilder operation links", () => {
  it("builds op link with string operation id", () => {
    const url = buildExplorerLink("op", "12345678901234567");
    expect(url).toBe("https://stellar.expert/explorer/testnet/op/12345678901234567");
  });

  it("normalizes alias type 'operation' to 'op' path segment", () => {
    const url = buildExplorerLink("operation", "999", { network: "futurenet" });
    expect(url).toBe("https://stellar.expert/explorer/futurenet/op/999");
  });

  it("accepts BigInt and number operation ids", () => {
    expect(buildExplorerLink("op", 456789)).toBe(
      "https://stellar.expert/explorer/testnet/op/456789",
    );
    expect(buildExplorerLink("op", 987654321012345678n)).toBe(
      "https://stellar.expert/explorer/testnet/op/987654321012345678",
    );
  });
});
