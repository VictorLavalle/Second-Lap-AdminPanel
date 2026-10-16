import { describe, expect, it } from "vitest";
import { clientKey } from "./clientKey";

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/admin/login", { headers });
}

describe("clientKey", () => {
  it("uses the first x-forwarded-for entry", () => {
    expect(clientKey(requestWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe(
      "1.1.1.1",
    );
  });

  it("falls back to x-real-ip then a constant", () => {
    expect(clientKey(requestWith({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientKey(requestWith({}))).toBe("unknown");
  });
});
