import { describe, expect, it } from "vitest";
import { readCookie } from "./cookies";

describe("readCookie", () => {
  it("returns the value for a present cookie", () => {
    expect(readCookie("a=1; sl_session=abc; b=2", "sl_session")).toBe("abc");
  });

  it("returns undefined when the cookie or header is absent", () => {
    expect(readCookie("a=1", "sl_session")).toBeUndefined();
    expect(readCookie(null, "sl_session")).toBeUndefined();
  });
});
