import { describe, expect, it } from "vitest";
import { buildExplorerLink } from "./explorerLinkBuilder";

const ACCOUNT_G = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

describe("explorerLinkBuilder account links", () => {
  it("builds testnet account link by default", () => {
    const url = buildExplorerLink("account", ACCOUNT_G);
    expect(url).toBe(`https://stellar.expert/explorer/testnet/account/${ACCOUNT_G}`);
  });

  it("builds public and futurenet account links", () => {
    expect(buildExplorerLink("account", ACCOUNT_G, { network: "public" })).toBe(
      `https://stellar.expert/explorer/public/account/${ACCOUNT_G}`,
    );
    expect(buildExplorerLink("account", ACCOUNT_G, { network: "futurenet" })).toBe(
      `https://stellar.expert/explorer/futurenet/account/${ACCOUNT_G}`,
    );
  });
});
