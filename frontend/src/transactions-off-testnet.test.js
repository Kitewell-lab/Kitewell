import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Issue #102: off Testnet, payment history skips the backend and is read
 * straight from Horizon. Mocks mirror the ones in stellar.test.js.
 */

vi.mock("./api", () => ({
  fetchAccountViaApi: vi.fn(),
  fetchPaymentsViaApi: vi.fn(),
}));

const { paymentsCallMock } = vi.hoisted(() => ({
  paymentsCallMock: vi.fn(),
}));

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
                order: () => ({ call: paymentsCallMock }),
              }),
            }),
          }),
        };
      }),
    },
  };
});

const { fetchPaymentsViaApi } = await import("./api");
const { setActiveNetwork } = await import("./network");
const { getTransactions } = await import("./stellar");

afterEach(() => {
  setActiveNetwork("TESTNET");
  vi.clearAllMocks();
});

describe("getTransactions off Testnet", () => {
  it("reads Futurenet history from Horizon without calling the backend", async () => {
    setActiveNetwork("FUTURENET");
    paymentsCallMock.mockResolvedValue({
      records: [
        {
          id: "1",
          type: "payment",
          from: "GFROM",
          to: "GTO",
          amount: "10.0000000",
          asset_type: "native",
          transaction_hash: "abc",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    });

    const { records, nextCursor } = await getTransactions("GTEST");

    expect(fetchPaymentsViaApi).not.toHaveBeenCalled();
    expect(paymentsCallMock).toHaveBeenCalledTimes(1);
    expect(records).toHaveLength(1);
    expect(records[0].transaction_hash).toBe("abc");
    expect(nextCursor).toBeNull();
  });
});
