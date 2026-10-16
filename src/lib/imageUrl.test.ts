import { describe, expect, it } from "vitest";
import { imageUrl } from "./imageUrl";

// NEXT_PUBLIC_BACKEND_PUBLIC_ORIGIN is unset in the test env, so the helper
// falls back to its localhost:8080 default.
describe("imageUrl", () => {
  it("prefixes a backend-relative path with the public origin", () => {
    expect(imageUrl("/uploads/a.png")).toBe(
      "http://localhost:8080/uploads/a.png",
    );
  });

  it("adds a leading slash when missing", () => {
    expect(imageUrl("uploads/a.png")).toBe(
      "http://localhost:8080/uploads/a.png",
    );
  });

  it("leaves absolute http(s) URLs untouched", () => {
    expect(imageUrl("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
  });

  it("leaves data and blob URIs untouched", () => {
    expect(imageUrl("data:image/png;base64,xxx")).toBe(
      "data:image/png;base64,xxx",
    );
    expect(imageUrl("blob:http://localhost/abc")).toBe(
      "blob:http://localhost/abc",
    );
  });
});
