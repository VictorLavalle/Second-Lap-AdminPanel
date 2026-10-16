import { describe, expect, it } from "vitest";
import { parseOrderListParams, parseProductListParams } from "./listParams";

const base = "http://localhost/api/admin/x";

describe("parseProductListParams", () => {
  it("keeps a valid status and normalizes sort direction", () => {
    const p = parseProductListParams(`${base}?status=vendido&sort=price,asc`);
    expect(p).toEqual({ status: "vendido", sort: "price,asc" });
  });

  it("drops an unknown status and an unlisted sort property", () => {
    const p = parseProductListParams(`${base}?status=foo&sort=hacker,asc`);
    expect(p).toEqual({ status: undefined, sort: undefined });
  });

  it("defaults an unknown sort direction to desc", () => {
    expect(parseProductListParams(`${base}?sort=createdAt,sideways`).sort).toBe(
      "createdAt,desc",
    );
  });

  it("returns undefined fields when no params are present", () => {
    expect(parseProductListParams(base)).toEqual({
      status: undefined,
      sort: undefined,
    });
  });
});

describe("parseOrderListParams", () => {
  it("keeps a valid order status and sort", () => {
    const p = parseOrderListParams(`${base}?status=confirmado&sort=total,asc`);
    expect(p).toEqual({ status: "confirmado", sort: "total,asc" });
  });

  it("rejects a product-only sort property for orders", () => {
    expect(parseOrderListParams(`${base}?sort=price,asc`).sort).toBeUndefined();
  });
});

describe("pagination params", () => {
  it("parses a valid page and allowed size", () => {
    const p = parseProductListParams(`${base}?page=3&size=50`);
    expect(p.page).toBe(3);
    expect(p.size).toBe(50);
  });

  it("coerces a negative page to 0 and drops a disallowed size", () => {
    const p = parseProductListParams(`${base}?page=-5&size=999`);
    expect(p.page).toBe(0);
    expect(p.size).toBeUndefined();
  });

  it("leaves page/size undefined when absent", () => {
    const p = parseOrderListParams(base);
    expect(p.page).toBeUndefined();
    expect(p.size).toBeUndefined();
  });
});
