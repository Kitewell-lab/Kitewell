import { describe, expect, it } from "vitest";
import { ORDER_BOOK_LEVELS, mapOrderBookLevels, orderBookView } from "./orderBook";

function levels(count, side) {
  return Array.from({ length: count }, (_, index) => ({
    price: side === "bid" ? String(1 - index / 100) : String(1 + index / 100),
    amount: String(100 - index),
    price_r: { n: 1, d: 1 },
  }));
}

describe("the ten-level cap", () => {
  it("defaults to ten levels a side", () => {
    expect(ORDER_BOOK_LEVELS).toBe(10);
  });

  it("keeps only the best ten bids", () => {
    const view = orderBookView({ bids: levels(15, "bid"), asks: [] });

    expect(view.bids).toHaveLength(10);
    expect(view.bids[0].price).toBe("1");
    expect(view.bids.at(-1).price).toBe("0.91");
  });

  it("keeps only the best ten asks", () => {
    const view = orderBookView({ bids: [], asks: levels(15, "ask") });

    expect(view.asks).toHaveLength(10);
    expect(view.asks.at(-1).price).toBe("1.09");
  });

  it("keeps a book that is shallower than the cap whole", () => {
    expect(mapOrderBookLevels(levels(3, "ask"))).toHaveLength(3);
  });

  it("accepts a custom cap", () => {
    expect(mapOrderBookLevels(levels(5, "bid"), 2)).toHaveLength(2);
  });
});
