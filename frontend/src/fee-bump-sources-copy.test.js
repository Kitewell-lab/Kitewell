// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionSources } from "./TransactionSources";

const OUTER = "GBOUTERFEEPAYERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const INNER = "GAINNERSOURCEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

let container;
let root;
let writeText;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("TransactionSources copy", () => {
  it("copies the full outer and inner addresses without selecting the row", async () => {
    const rowClick = vi.fn();
    await act(async () => {
      root.render(
        createElement(
          "div",
          { onClick: rowClick },
          createElement(TransactionSources, {
            tx: { fee_bumped: true, fee_account: OUTER, source_account: INNER },
          })
        )
      );
    });

    const buttons = [...container.querySelectorAll("button")];
    expect(buttons).toHaveLength(2);

    for (const button of buttons) {
      await act(async () => button.click());
    }

    expect(writeText.mock.calls).toEqual([[OUTER], [INNER]]);
    expect(rowClick).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Copied");
  });
});
