import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock config module
vi.mock("./src/config", () => ({
  API_BASE: "http://localhost:8787",
}));

// Mock stelllar module to include setActiveNetwork from network
const actualStellar = await vi.importActual("./stellar");
const networkModule = await vi.importActual("./network");
vi.mock("./stellar", () => ({
  ...actualStellar,
  setActiveNetwork: networkModule.setActiveNetwork,
}));

import * as StellarSdk from "@stellar/stellar-sdk";
import { getTransactions, setActiveNetwork } from "./stellar";

const MOCK_HORIZON_URL = "https://horizon-testnet.stellar.org";
const MOCK_ACTIVE_NETWORK = {
  horizonUrl: MOCK_HORIZON_URL,
  passphrase: StellarSdk.Networks.TESTNET,
};

const MOCK_FUTURENET_NETWORK = {
  horizonUrl: "https://horizon-futurenet.stellar.org",
  passphrase: StellarSdk.Networks.FUTURENET,
};

const MOCK_PAYMENTS = [
  {
    id: "1",
    paging_token: "10",
    transaction_hash: "abc",
    type: "payment",
    type_i: 0,
    created_at: "2024-01-01T00:00:00Z",
    source_account: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    amount: "10.0000000",
    asset_type: "native",
    from: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    to: "GAAAAABb",
  },
];

describe("transactions-off-testnet", () => {
  let fetchMock;
  let fetchPaymentsViaApiMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.stubGlobal("fetch", fetchMock);
    // Mock the api module's fetchPaymentsViaApi
    fetchPaymentsViaApiMock = vi.spyOn(require("./api"), "fetchPaymentsViaApi");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Ensure we reset to TESTNET after each test
    setActiveNetwork(MOCK_ACTIVE_NETWORK);
  });

  describe("getTransactions", () => {
    it("on TESTNET, calls fetchPaymentsViaApi and Horizon", async () => {
      // Mock fetchPaymentsViaApi to return empty array
      fetchPaymentsViaApiMock.mockResolvedValue([]);
      // Mock Horizon response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _embedded: { records: MOCK_PAYMENTS },
        }),
      });

      const result = await getTransactions();
      expect(fetchPaymentsViaApiMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(MOCK_PAYMENTS);
    });

    it("on FUTURENET, does not call fetchPaymentsViaApi but calls Horizon", async () => {
      // Switch to FUTURENET
      setActiveNetwork(MOCK_FUTURENET_NETWORK);
      // Mock fetchPaymentsViaApi to ensure it's not called
      fetchPaymentsViaApiMock.mockResolvedValue([]);
      // Mock Horizon response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _embedded: { records: MOCK_PAYMENTS },
        }),
      });

      const result = await getTransactions();
      expect(fetchPaymentsViaApiMock).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(MOCK_PAYMENTS);
    });
  });
});
