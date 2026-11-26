import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  describeOfferFill,
  getOfferOriginalAmount,
  withOfferOriginalAmounts,
} from "./stellar";
import { OfferFillSummary } from "./OfferFillSummary";

const ISSUER = "GISSUER";
const baseOffer = {
  offerId: "42",
  selling: { isNative: true },
  buying: { isNative: false, code: "USD", issuer: ISSUER },
  priceNumerator: "1",
  priceDenominator: "2",
};

/** 100 XLM offer that has sold 40 XLM, so 60 XLM is still open. */
const partlyFilled = { ...baseOffer, amount: "60.0000000", originalAmount: "100.0000000" };
/** 25 XLM offer that has not filled at all. */
const fullyOpen = { ...baseOffer, amount: "25.0000000", originalAmount: "25.0000000" };

const render = (offer) =>
  renderToStaticMarkup(createElement(OfferFillSummary, { offer, assetLabel: "XLM" }));

describe("open offer fill", () => {
  it("renders a partly filled offer with its original and open amounts", () => {
    const html = render(partlyFilled);
    expect(html).toContain("60.0000000 of 100.0000000 XLM still open");
    expect(html).toContain("40.0000000 XLM filled");
    expect(describeOfferFill(partlyFilled).state).toBe("partial");
  });

  it("says a fully open offer is fully open", () => {
    const html = render(fullyOpen);
    expect(html).toContain("Fully open");
    expect(html).toContain("25.0000000 of 25.0000000 XLM");
    expect(describeOfferFill(fullyOpen).state).toBe("open");
  });

  it("shows a missing amount as unknown and does not allow cancelling it", () => {
    const offer = { ...baseOffer, amount: null, originalAmount: null };
    const fill = describeOfferFill(offer);
    expect(fill).toMatchObject({ state: "unknown", cancellable: false });
    expect(render(offer)).toContain("Open amount unknown");
    expect(describeOfferFill(partlyFilled).cancellable).toBe(true);
  });

  it("keeps the open amount when the original cannot be read", () => {
    const offer = { ...baseOffer, amount: "7.5000000", originalAmount: null };
    expect(describeOfferFill(offer)).toMatchObject({
      state: "original-unknown",
      remaining: "7.5000000",
      cancellable: true,
    });
    expect(render(offer)).toContain("original amount unknown");
  });
});

describe("reading the original amount from the offer", () => {
  it("adds the offer's own fills to what is still open", async () => {
    const fetchOfferTrades = vi.fn(async () => ({
      records: [
        // The offer sold XLM as the base asset ...
        {
          base_asset_type: "native",
          base_amount: "30.0000000",
          counter_asset_type: "credit_alphanum4",
          counter_asset_code: "USD",
          counter_asset_issuer: ISSUER,
          counter_amount: "15.0000000",
        },
        // ... and as the counter asset.
        {
          base_asset_type: "credit_alphanum4",
          base_asset_code: "USD",
          base_asset_issuer: ISSUER,
          base_amount: "5.0000000",
          counter_asset_type: "native",
          counter_amount: "10.0000000",
        },
      ],
    }));

    const original = await getOfferOriginalAmount(
      { ...baseOffer, amount: "60.0000000" },
      { fetchOfferTrades }
    );

    expect(fetchOfferTrades).toHaveBeenCalledWith("42", undefined);
    expect(original).toBe("100.0000000");
  });

  it("reports an unfilled offer's original as its open amount", async () => {
    const original = await getOfferOriginalAmount(
      { ...baseOffer, amount: "25.0000000" },
      { fetchOfferTrades: async () => ({ records: [] }) }
    );
    expect(original).toBe("25.0000000");
  });

  it("leaves the original unknown when the fills cannot be read", async () => {
    const [offer] = await withOfferOriginalAmounts([{ ...baseOffer, amount: "1.0000000" }], {
      fetchOfferTrades: async () => {
        throw new Error("Horizon unavailable");
      },
    });
    expect(offer.originalAmount).toBeNull();
  });

  it("does not look up an offer whose amount is missing", async () => {
    const fetchOfferTrades = vi.fn();
    const original = await getOfferOriginalAmount(
      { ...baseOffer, amount: null },
      { fetchOfferTrades }
    );
    expect(original).toBeNull();
    expect(fetchOfferTrades).not.toHaveBeenCalled();
  });
});
