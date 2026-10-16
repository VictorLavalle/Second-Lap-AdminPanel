import { describe, expect, it } from "vitest";
import { readErrorRef, withErrorRef } from "./errorRef";

describe("readErrorRef", () => {
  it("returns the ref when the body carries a non-empty string", () => {
    expect(readErrorRef({ ref: "corr-1" })).toBe("corr-1");
  });

  it("returns null for missing, empty or non-string refs", () => {
    expect(readErrorRef(null)).toBeNull();
    expect(readErrorRef({})).toBeNull();
    expect(readErrorRef({ ref: "" })).toBeNull();
    expect(readErrorRef({ ref: 123 })).toBeNull();
  });
});

describe("withErrorRef", () => {
  it("appends 'Ref: <id>' when a ref is present", () => {
    expect(withErrorRef("Error inesperado.", "corr-1")).toBe(
      "Error inesperado. Ref: corr-1",
    );
  });

  it("returns the base message unchanged when there is no ref", () => {
    expect(withErrorRef("Error inesperado.", null)).toBe("Error inesperado.");
  });
});
