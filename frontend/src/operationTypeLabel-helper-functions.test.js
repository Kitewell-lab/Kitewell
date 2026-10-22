import { describe, expect, it } from "vitest";
import {
  getOperationTypeLabel,
  getOperationTypeIcon,
  isKnownOperationType,
} from "./operationTypeLabel";

describe("operationTypeLabel helper functions", () => {
  it("getOperationTypeLabel returns label string directly", () => {
    expect(getOperationTypeLabel("payment")).toBe("Payment");
    expect(getOperationTypeLabel("bump_sequence")).toBe("Bump Sequence");
    expect(getOperationTypeLabel("unknown_op")).toBe("Unknown Op");
  });

  it("getOperationTypeIcon returns iconId string directly", () => {
    expect(getOperationTypeIcon("payment")).toBe("arrow-right");
    expect(getOperationTypeIcon("change_trust")).toBe("link");
    expect(getOperationTypeIcon("unknown_op")).toBe("help-circle");
  });

  it("isKnownOperationType correctly tests membership", () => {
    expect(isKnownOperationType("payment")).toBe(true);
    expect(isKnownOperationType("create_account")).toBe(true);
    expect(isKnownOperationType("unsupported_future_op")).toBe(false);
    expect(isKnownOperationType(null)).toBe(false);
  });
});
