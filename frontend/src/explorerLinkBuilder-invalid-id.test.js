import { describe, expect, it } from "vitest";
import { buildExplorerLink } from "./explorerLinkBuilder";

describe("explorerLinkBuilder invalid entity ID formats", () => {
  it("throws RangeError on malformed account IDs", () => {
    expect(() => buildExplorerLink("account", "GSHORT")).toThrow(RangeError);
    expect(() =>
      buildExplorerLink(
        "account",
        "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      ),
    ).toThrow(RangeError);
    expect(() =>
      buildExplorerLink(
        "account",
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA888",
      ),
    ).toThrow(RangeError);
  });

  it("throws RangeError on malformed tx hash", () => {
    expect(() => buildExplorerLink("tx", "not-a-hash")).toThrow(RangeError);
    expect(() => buildExplorerLink("tx", "12345")).toThrow(RangeError);
  });

  it("throws RangeError on malformed operation id", () => {
    expect(() => buildExplorerLink("op", "op-123")).toThrow(RangeError);
    expect(() => buildExplorerLink("op", "-50")).toThrow(RangeError);
  });

  it("throws RangeError or TypeError on empty or invalid id types", () => {
    expect(() => buildExplorerLink("account", "")).toThrow(RangeError);
    expect(() => buildExplorerLink("account", "   ")).toThrow(RangeError);
    expect(() => buildExplorerLink("account", null)).toThrow(TypeError);
  });
});
