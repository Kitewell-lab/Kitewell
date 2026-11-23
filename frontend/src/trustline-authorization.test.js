import { describe, expect, it } from "vitest";
import {
  flagLabel,
  isCreditAssetSendable,
  trustlineAuthorizationLabel,
} from "./trustlineAuthorization";

describe("trustline authorization", () => {
  it("keeps unauthorized and unknown credit assets out of the send picker", () => {
    const balances = [
      { key: "authorized", isNative: false, isAuthorized: true },
      { key: "unauthorized", isNative: false, isAuthorized: false },
      { key: "unknown", isNative: false, isAuthorized: null },
    ];

    expect(balances.filter(isCreditAssetSendable)).toEqual([balances[0]]);
    expect(trustlineAuthorizationLabel(balances[1])).toMatch(/Unauthorized/);
    expect(trustlineAuthorizationLabel(balances[2])).toMatch(/unknown/);
  });

  it("does not apply trustline authorization flags to native XLM", () => {
    expect(isCreditAssetSendable({ isNative: true })).toBe(true);
  });

  it("renders missing flags as unknown", () => {
    expect(flagLabel(undefined, "yes", "no")).toBe("unknown");
    expect(flagLabel(false, "enabled", "disabled")).toBe("disabled");
    expect(flagLabel(true, "enabled", "disabled")).toBe("enabled");
  });
});
