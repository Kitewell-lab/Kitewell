import { describe, expect, it } from "vitest";
import defaultBuilder, {
  explorerLinkBuilder,
  buildExplorerLink,
} from "./explorerLinkBuilder";

describe("explorerLinkBuilder export aliases", () => {
  it("default and named exports point to buildExplorerLink", () => {
    expect(defaultBuilder).toBe(buildExplorerLink);
    expect(explorerLinkBuilder).toBe(buildExplorerLink);
  });
});
