import { describe, expect, it } from "vitest";
import { orderBookView } from "./orderBook";

const FIXTURE_BOOK = {
  bids: [
    { price: "0.5", amount: "120.0000000", price_r: { n: 1, d: 2 } },
    { price: "0.49", amount: "80.0000000", price_r: { n: 49, d: 100 } },
  ],
  asks: [
    { price: "0.51", amount: "60.0000000", price_r: { n: 51, d: 100 } },
    { price: "0.52", amount: "40.0000000", price_r: { n: 52, d: 100 } },
  ],
};

describe("orderBookView", () => {
  it("renders a fixture book with the best bids and asks", () => {
    const view = orderBookView(FIXTURE_BOOK);

    expect(view.isEmpty).toBe(false);
    expect(view.bids).toEqual([
      { price: "0.5", amount: "120.0000000", priceR: { n: 1, d: 2 } },
      { price: "0.49", amount: "80.0000000", priceR: { n: 49, d: 100 } },
    ]);
    expect(view.asks).toEqual([
      { price: "0.51", amount: "60.0000000", priceR: { n: 51, d: 100 } },
      { price: "0.52", amount: "40.0000000", priceR: { n: 52, d: 100 } },
    ]);
  });

  it("keeps Horizon's ordering of each side", () => {
    const view = orderBookView(FIXTURE_BOOK);

    expect(view.bids.map((b) => b.price)).toEqual(["0.5", "0.49"]);
    expect(view.asks.map((a) => a.price)).toEqual(["0.51", "0.52"]);
  });

  it("tolerates a missing side", () => {
    expect(orderBookView({ asks: FIXTURE_BOOK.asks }).bids).toEqual([]);
    expect(orderBookView({ bids: FIXTURE_BOOK.bids }).asks).toEqual([]);
  });

  it("rejects a payload that is not a book", () => {
    expect(() => orderBookView(null)).toThrow(/book must be an object/);
    expect(() => orderBookView("book")).toThrow(/book must be an object/);
  });

  it("rejects a level without a price or amount", () => {
    expect(() => orderBookView({ bids: [{ price: "1" }] })).toThrow(
      /needs a price and an amount/
    );
  });
});
