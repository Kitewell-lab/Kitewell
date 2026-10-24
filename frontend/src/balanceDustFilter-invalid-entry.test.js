import { describe, expect, it } from "vitest";
import { filterDustBalances } from "./balanceDustFilter";

describe("balanceDustFilter invalid balance entries", () => {
  it("throws TypeError when an entry is null or not an object", () => {
    expect(() => filterDustBalances([null])).toThrow("each balance must be an object");
    expect(() => filterDustBalances([undefined])).toThrow(TypeError);
    expect(() => filterDustBalances(["string_entry"])).toThrow(TypeError);
    expect(() => filterDustBalances([42])).toThrow(TypeError);
  });
});
