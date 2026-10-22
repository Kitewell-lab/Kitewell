import { describe, expect, it } from "vitest";
import { buildExplorerLink } from "./explorerLinkBuilder";

const ACCOUNT_G = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

describe("explorerLinkBuilder network option validation", () => {
  it("throws RangeError on unsupported network name", () => {
    expect(() =>
      buildExplorerLink("account", ACCOUNT_G, { network: "mainnet" }),
    ).toThrow(RangeError);
    expect(() =>
      buildExplorerLink("account", ACCOUNT_G, { network: "local" }),
    ).toThrow(RangeError);
  });

  it("handles case-insensitive network names like TESTNET and Public", () => {
    expect(
      buildExplorerLink("account", ACCOUNT_G, { network: "TESTNET" }),
    ).toContain("/testnet/");
    expect(
      buildExplorerLink("account", ACCOUNT_G, { network: "Public" }),
    ).toContain("/public/");
  });
});
