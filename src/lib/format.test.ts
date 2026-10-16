import { describe, expect, it } from "vitest";
import { formatPrice, formatPriceWithCents } from "./format";

describe("formatPrice", () => {
  it("formats whole MXN amounts without decimals", () => {
    expect(formatPrice(450)).toContain("450");
    expect(formatPrice(450)).toMatch(/\$/);
  });

  it("rounds to zero fraction digits", () => {
    expect(formatPrice(1234.56)).not.toContain(".56");
  });
});

describe("formatPriceWithCents", () => {
  it("formats with a thousands separator and two decimals", () => {
    const out = formatPriceWithCents(1500);
    expect(out).toContain("1,500.00");
    expect(out).toMatch(/\$/);
  });

  it("keeps two decimals for fractional amounts", () => {
    expect(formatPriceWithCents(1234.5)).toContain("1,234.50");
  });
});
