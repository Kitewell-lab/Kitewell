import { beforeEach, describe, expect, it, vi } from "vitest";

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
const { getTransactions } = await import("./stellar");

beforeEach(() => {
  vi.clearAllMocks();
  paymentsCallMock.mockReset();
});

/**
 * Issue #220: getTransactions is the UI's paging entry point, so it must pass
 * the cursor through and hand back the page (records + nextCursor) unchanged.
 */
describe("getTransactions pagination", () => {
  it("loads the first page without a cursor", async () => {
    const page = { records: [{ id: "p2" }, { id: "p1" }], nextCursor: "token-1" };
    fetchPaymentsViaApi.mockResolvedValue(page);

    await expect(getTransactions("GTEST")).resolves.toEqual(page);

    expect(fetchPaymentsViaApi).toHaveBeenCalledTimes(1);
    expect(fetchPaymentsViaApi.mock.calls[0][0]).toBe("GTEST");
    expect(fetchPaymentsViaApi.mock.calls[0][1]).toBe(15);
    expect(fetchPaymentsViaApi.mock.calls[0][2]).toBeUndefined();
  });

  it("forwards the cursor and returns the next page", async () => {
    const page = { records: [{ id: "p0" }], nextCursor: null };
    fetchPaymentsViaApi.mockResolvedValue(page);

    await expect(getTransactions("GTEST", 15, "token-1")).resolves.toEqual(page);

    expect(fetchPaymentsViaApi.mock.calls[0][2]).toBe("token-1");
  });

  it("ends paging when the last page reports no cursor", async () => {
    fetchPaymentsViaApi.mockResolvedValue({ records: [{ id: "p0" }], nextCursor: null });

    const page = await getTransactions("GTEST", 15, "token-2");

    expect(page.records).toEqual([{ id: "p0" }]);
    expect(page.nextCursor).toBeNull();
  });

  it("returns an empty page and no cursor when there is no history", async () => {
    fetchPaymentsViaApi.mockResolvedValue({ records: [], nextCursor: null });

    await expect(getTransactions("GTEST")).resolves.toEqual({
      records: [],
      nextCursor: null,
    });
  });

  it("treats the direct-Horizon fallback as a single page", async () => {
    fetchPaymentsViaApi.mockRejectedValue(new Error("backend down"));
    paymentsCallMock.mockResolvedValue({
      records: [
        {
          type: "payment",
          id: "p1",
          from: "GALICE",
          to: "GTEST",
          amount: "1.0000000",
          asset_type: "native",
          transaction_hash: "h1",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const page = await getTransactions("GTEST");

    expect(page.records).toHaveLength(1);
    expect(page.records[0].id).toBe("p1");
    expect(page.nextCursor).toBeNull();
  });
});
