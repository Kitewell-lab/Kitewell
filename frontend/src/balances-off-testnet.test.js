import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  fetchAccountViaApi: vi.fn(),
  fetchPaymentsViaApi: vi.fn(),
}));

const { loadAccountMock, paymentsCallMock } = vi.hoisted(() => ({
  loadAccountMock: vi.fn(),
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
          loadAccount: loadAccountMock,
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

const { fetchAccountViaApi } = await import("./api");
const { setActiveNetwork } = await import("./network");
const { getAccountBalances } = await import("./stellar");

beforeEach(() => {
  vi.clearAllMocks();
  loadAccountMock.mockReset();
  paymentsCallMock.mockReset();
});

afterEach(() => {
  setActiveNetwork("TESTNET");
  vi.unstubAllGlobals();
});

describe("Futurenet account balances", () => {
  it("loads balances from Horizon without calling the backend", async () => {
    setActiveNetwork("FUTURENET");
    fetchAccountViaApi.mockResolvedValue({
      balances: [{ key: "native", code: "XLM", balance: "9.0000000", isNative: true }],
    });
    loadAccountMock.mockResolvedValue({
      balances: [{ asset_type: "native", balance: "3.5000000" }],
    });

    await expect(getAccountBalances("GTEST")).resolves.toEqual([
      {
        key: "native",
        code: "XLM",
        issuer: null,
        balance: "3.5000000",
        limit: null,
        isNative: true,
      },
    ]);
    expect(loadAccountMock).toHaveBeenCalledWith("GTEST");
    expect(fetchAccountViaApi).not.toHaveBeenCalled();
  });
});