import { describe, expect, it } from "vitest";
import { buildExplorerLink } from "./explorerLinkBuilder";

describe("explorerLinkBuilder unsupported entity types", () => {
  it("throws RangeError on unknown entity types", () => {
    expect(() => buildExplorerLink("ledger", "12345")).toThrow(RangeError);
    expect(() => buildExplorerLink("contract", "CAAAAA")).toThrow(RangeError);
    expect(() => buildExplorerLink("unknown", "123")).toThrow(RangeError);
  });

  it("throws TypeError when type is not a string", () => {
    expect(() => buildExplorerLink(null, "123")).toThrow(TypeError);
    expect(() => buildExplorerLink(undefined, "123")).toThrow(TypeError);
    expect(() => buildExplorerLink(123, "123")).toThrow(TypeError);
  });
});
