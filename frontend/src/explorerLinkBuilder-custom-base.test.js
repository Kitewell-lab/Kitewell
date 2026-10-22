import { describe, expect, it } from "vitest";
import { buildExplorerLink } from "./explorerLinkBuilder";

const ACCOUNT_G = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

describe("explorerLinkBuilder custom baseUrl", () => {
  it("respects custom baseUrl option without trailing slash", () => {
    const url = buildExplorerLink("account", ACCOUNT_G, {
      baseUrl: "https://custom-explorer.org",
      network: "testnet",
    });
    expect(url).toBe(`https://custom-explorer.org/testnet/account/${ACCOUNT_G}`);
  });

  it("trims trailing slash from custom baseUrl", () => {
    const url = buildExplorerLink("account", ACCOUNT_G, {
      baseUrl: "https://custom-explorer.org/subpath/",
      network: "public",
    });
    expect(url).toBe(`https://custom-explorer.org/subpath/public/account/${ACCOUNT_G}`);
  });
});
