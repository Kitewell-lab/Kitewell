import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPaymentsViaApi } from "./api";

/**
 * Issue #74: lock the successful payments payload.
 *
 * On an ok response, fetchPaymentsViaApi resolves with `data.records` so the
 * UI receives the backend's payment rows unchanged.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPaymentsViaApi records", () => {
  it("resolves to the records array from an ok body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: [{ id: "p1" }] }),
      })
    );

    await expect(fetchPaymentsViaApi("GTEST")).resolves.toEqual([{ id: "p1" }]);
  });
});
