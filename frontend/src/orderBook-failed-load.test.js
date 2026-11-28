import { describe, expect, it } from "vitest";
import { orderBookFailureMessage } from "./orderBook";

describe("orderBookFailureMessage", () => {
  it("says the book could not be read and keeps the form", () => {
    const message = orderBookFailureMessage(new Error("Horizon timed out"));

    expect(message).toMatch(/could not be read/);
    expect(message).toMatch(/Horizon timed out/);
    expect(message).toMatch(/form was kept/);
  });

  it("reads without a detail when the error has no message", () => {
    expect(orderBookFailureMessage(undefined)).toBe(
      "The order book could not be read. The offer form was kept — try loading the book again."
    );
    expect(orderBookFailureMessage({})).not.toMatch(/undefined/);
  });

  it("does not claim the load succeeded", () => {
    expect(orderBookFailureMessage(new Error("nope"))).not.toMatch(
      /loaded|success/
    );
  });
});
