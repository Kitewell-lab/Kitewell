import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { tradesCallMock } = vi.hoisted(() => ({ tradesCallMock: vi.fn() }));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn(function () {
        return {
          trades: () => ({
            forAccount: () => ({
              limit: () => ({
                order: () => ({
                  call: tradesCallMock,
                  cursor: () => ({ call: tradesCallMock }),
                }),
              }),
            }),
          }),
        };
      }),
    },
  };
});

const { NETWORKS } = await import("./network");
const { getTrades, tradeExplorerLink, tradeLedger, tradeOperationId } =
  await import("./stellar");
const { TradeSettlement } = await import("./TradeSettlement");

const HASH = "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889";
// Operation TOID for ledger 123456, transaction 1, operation 1.
const OPERATION_ID = String((123456n << 32n) | (1n << 12n) | 1n);

/** A trade as getTrades returns it once the settling hash is known. */
const fixtureTrade = {
  id: `${OPERATION_ID}-0`,
  ledger: 123456,
  transaction_hash: HASH,
  base_account: "GBASE",
  base_amount: "10.0000000",
  counter_account: "GCOUNTER",
  counter_amount: "5.0000000",
  price: { n: 1, d: 2 },
};

const render = (props) =>
  renderToStaticMarkup(createElement(TradeSettlement, props));

describe("trade settlement link", () => {
  it("builds the explorer link for the trade on testnet", () => {
    expect(tradeExplorerLink(fixtureTrade, NETWORKS.TESTNET)).toBe(
      `https://stellar.expert/explorer/testnet/tx/${HASH}`
    );
  });

  it("builds the explorer link for the trade on futurenet", () => {
    expect(tradeExplorerLink(fixtureTrade, NETWORKS.FUTURENET)).toBe(
      `https://stellar.expert/explorer/futurenet/tx/${HASH}`
    );
  });

  it("follows the selected network instead of a hardcoded testnet explorer", () => {
    const html = render({ trade: fixtureTrade, network: NETWORKS.FUTURENET });
    expect(html).toContain(`href="https://stellar.expert/explorer/futurenet/tx/${HASH}"`);
    expect(html).not.toContain("explorer/testnet");
  });

  it("falls back to the network's Horizon when it has no explorer", () => {
    const custom = { horizonUrl: "https://horizon.example.org", explorerBase: null };
    expect(tradeExplorerLink(fixtureTrade, custom)).toBe(
      `https://horizon.example.org/transactions/${HASH}`
    );
  });

  it("shows the ledger next to the link, and the link only opens the explorer", () => {
    const html = render({ trade: fixtureTrade, network: NETWORKS.TESTNET });
    expect(html).toContain("Ledger 123456");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<button");
  });

  it("says the transaction is unknown when the trade has no hash", () => {
    const trade = { ...fixtureTrade, transaction_hash: null };
    expect(tradeExplorerLink(trade, NETWORKS.TESTNET)).toBeNull();
    const html = render({ trade, network: NETWORKS.TESTNET });
    expect(html).toContain("Transaction unknown");
    expect(html).not.toContain("<a");
  });

  it("reads the ledger from the trade's own id", () => {
    expect(tradeOperationId(fixtureTrade)).toBe(OPERATION_ID);
    expect(tradeLedger(fixtureTrade)).toBe(123456);
    expect(tradeLedger({ id: "not-a-toid" })).toBeNull();
  });
});

describe("getTrades settlement fields", () => {
  it("adds the ledger and the hash of each trade's operation", async () => {
    tradesCallMock.mockResolvedValue({
      records: [
        { id: `${OPERATION_ID}-0`, paging_token: `${OPERATION_ID}-0` },
        { id: "999-0", paging_token: "999-0" },
      ],
    });
    const fetchOperation = vi.fn(async (id) => {
      if (id === OPERATION_ID) return { transaction_hash: HASH };
      throw new Error("Horizon unavailable");
    });

    const page = await getTrades("GTEST", 15, undefined, { fetchOperation });

    expect(fetchOperation).toHaveBeenCalledWith(OPERATION_ID);
    expect(page.records[0]).toMatchObject({ ledger: 123456, transaction_hash: HASH });
    // A lookup that fails leaves that trade's hash unknown, not the page.
    expect(page.records[1].transaction_hash).toBeNull();
  });
});
