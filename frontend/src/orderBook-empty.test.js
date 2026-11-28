import { describe, expect, it } from "vitest";
import { orderBookView } from "./orderBook";

describe("empty order book", () => {
  it("is an empty state, not an error", () => {
    const view = orderBookView({ bids: [], asks: [] });

    expect(view.isEmpty).toBe(true);
    expect(view.bids).toEqual([]);
    expect(view.asks).toEqual([]);
  });

  it("treats an empty payload as an empty book", () => {
    expect(orderBookView({})).toEqual({ bids: [], asks: [], isEmpty: true });
  });

  it("is not empty when only one side has levels", () => {
    const view = orderBookView({
      bids: [{ price: "0.5", amount: "10" }],
      asks: [],
    });

    expect(view.isEmpty).toBe(false);
  });
});
