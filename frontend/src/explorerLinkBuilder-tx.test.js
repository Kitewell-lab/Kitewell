import { describe, expect, it } from "vitest";
import { buildExplorerLink } from "./explorerLinkBuilder";

const TX_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("explorerLinkBuilder transaction links", () => {
  it("builds tx link with type 'tx'", () => {
    const url = buildExplorerLink("tx", TX_HASH);
    expect(url).toBe(`https://stellar.expert/explorer/testnet/tx/${TX_HASH}`);
  });

  it("normalizes alias type 'transaction' to 'tx' path segment", () => {
    const url = buildExplorerLink("transaction", TX_HASH, { network: "public" });
    expect(url).toBe(`https://stellar.expert/explorer/public/tx/${TX_HASH}`);
  });

  it("accepts uppercase hex characters", () => {
    const upper = TX_HASH.toUpperCase();
    const url = buildExplorerLink("tx", upper);
    expect(url).toBe(`https://stellar.expert/explorer/testnet/tx/${upper}`);
  });
});
