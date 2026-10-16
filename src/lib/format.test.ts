import { describe, expect, it } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("formats whole MXN amounts without decimals", () => {
    expect(formatPrice(450)).toContain("450");
    expect(formatPrice(450)).toMatch(/\$/);
  });

  it("rounds to zero fraction digits", () => {
    expect(formatPrice(1234.56)).not.toContain(".56");
  });
});
