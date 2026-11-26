import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  fetchAccountViaApi: vi.fn(),
  fetchPaymentsViaApi: vi.fn(),
}));

const { paymentsCallMock } = vi.hoisted(() => ({ paymentsCallMock: vi.fn() }));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: vi.fn(function () {
        return {
          payments: () => ({
            forAccount: () => ({
              limit: () => ({
                order: () => ({ join: () => ({ call: paymentsCallMock }) }),
              }),
            }),
          }),
        };
      }),
    },
  };
});

const { fetchPaymentsViaApi } = await import("./api");
const { getTransactions } = await import("./stellar");
const { mapTransactionSources, formatHistoryFee } = await import("./historyFee");
const { mapStreamPayment } = await import("./paymentStream");
const { TransactionSources } = await import("./TransactionSources");

const OUTER = "GBOUTERFEEPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const INNER = "GAINNERSOURCEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

/** A fee-bump transaction record as Horizon embeds it with join=transactions. */
const FEE_BUMP_TX = {
  hash: "outer-hash",
  fee_account: OUTER,
  source_account: INNER,
  fee_charged: "400",
  max_fee: "1000",
  operation_count: 1,
  fee_bump_transaction: { hash: "outer-hash", signatures: [] },
  inner_transaction: { hash: "inner-hash", max_fee: "100", signatures: [] },
};

/** A normal transaction: Horizon reports the same account as fee payer and source. */
const NORMAL_TX = {
  hash: "plain-hash",
  fee_account: INNER,
  source_account: INNER,
  fee_charged: "100",
  operation_count: 1,
};

function payment(id, transaction) {
  return {
    type: "payment",
    id,
    from: INNER,
    to: "GTEST",
    amount: "1.0000000",
    asset_type: "native",
    transaction_hash: `hash-${id}`,
    created_at: "2026-01-01T00:00:00Z",
    transaction,
  };
}

const render = (tx) => renderToStaticMarkup(createElement(TransactionSources, { tx }));

beforeEach(() => {
  vi.clearAllMocks();
  fetchPaymentsViaApi.mockRejectedValue(new Error("backend down"));
});

describe("mapTransactionSources", () => {
  it("names the outer and the inner source of a fee bump", () => {
    expect(mapTransactionSources(FEE_BUMP_TX)).toEqual({
      fee_account: OUTER,
      source_account: INNER,
    });
  });

  it("names the one source of a normal transaction and no outer one", () => {
    expect(mapTransactionSources(NORMAL_TX)).toEqual({
      fee_account: null,
      source_account: INNER,
    });
  });

  it("leaves the inner source null when a fee bump's inner transaction was not read", () => {
    const withoutInner = { ...FEE_BUMP_TX };
    delete withoutInner.source_account;
    expect(mapTransactionSources(withoutInner)).toEqual({
      fee_account: OUTER,
      source_account: null,
    });
  });

  it("returns nulls when there is no transaction record", () => {
    expect(mapTransactionSources(undefined)).toEqual({
      fee_account: null,
      source_account: null,
    });
  });
});

describe("history row sources", () => {
  it("reads both sources and the outer fee for a fee-bumped history row", async () => {
    paymentsCallMock.mockResolvedValue({
      records: [payment("p1", FEE_BUMP_TX), payment("p2", NORMAL_TX)],
    });

    const { records } = await getTransactions("GTEST");

    expect(records[0]).toMatchObject({
      fee_bumped: true,
      fee_account: OUTER,
      source_account: INNER,
    });
    expect(formatHistoryFee(records[0])).toBe(
      "Outer fee paid 0.00004 XLM · fee-bumped · 1 operation"
    );
    expect(records[1]).toMatchObject({
      fee_bumped: false,
      fee_account: null,
      source_account: INNER,
    });
    expect(formatHistoryFee(records[1])).toBe("Fee 0.00001 XLM · 1 operation");
  });

  it("maps streamed payments with the same sources as paged history", async () => {
    paymentsCallMock.mockResolvedValue({ records: [payment("p1", FEE_BUMP_TX)] });
    const { records } = await getTransactions("GTEST");
    expect(mapStreamPayment(payment("p1", FEE_BUMP_TX))).toEqual(records[0]);
  });

  it("renders the outer and the inner source of a fee-bumped transaction", () => {
    const html = render({ fee_bumped: true, ...mapTransactionSources(FEE_BUMP_TX) });

    expect(html).toContain("Outer source (paid the fee)");
    expect(html).toContain("Inner source");
    expect(html).toContain(`title="${OUTER}"`);
    expect(html).toContain(`title="${INNER}"`);
    expect(html).toContain(`aria-label="Copy outer source (paid the fee) ${OUTER}"`);
    expect(html).toContain(`aria-label="Copy inner source ${INNER}"`);
  });

  it("renders one source and no outer source for a normal payment", () => {
    const html = render({ fee_bumped: false, ...mapTransactionSources(NORMAL_TX) });

    expect(html).toContain("Source");
    expect(html).toContain(`title="${INNER}"`);
    expect(html).toContain(`aria-label="Copy source ${INNER}"`);
    expect(html).not.toContain("Outer");
    expect(html).not.toContain("Inner");
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it("says the inner transaction could not be read when its source is missing", () => {
    const html = render({ fee_bumped: true, fee_account: OUTER, source_account: null });

    expect(html).toContain("Outer source (paid the fee)");
    expect(html).toContain("The inner transaction could not be read.");
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it("renders nothing when a normal row has no source", () => {
    expect(render({ fee_bumped: false, fee_account: null, source_account: null })).toBe("");
  });
});
