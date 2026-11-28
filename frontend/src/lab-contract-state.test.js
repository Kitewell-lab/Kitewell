import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LabContractState from "./LabContractState";

describe("LabContractState", () => {
  it("renders a fixture lab name without a connected wallet", () => {
    const markup = renderToStaticMarkup(
      createElement(LabContractState, {
        labState: {
          labName: "Fixture Lab",
          builderCount: 0,
          builder: null,
          paused: false,
          admin: null,
        },
        publicKey: null,
      })
    );

    expect(markup).toContain("Fixture Lab");
    expect(markup).toContain("Connect to check");
  });
});
