import { describe, expect, it } from "vitest";
import { sanitizeDigits, sanitizeMultiline, sanitizeText } from "./sanitize";

describe("sanitizeText", () => {
  it("removes angle brackets and control characters", () => {
    expect(sanitizeText("a<b>c\u0007d")).toBe("abcd");
  });

  it("caps length at the given maximum", () => {
    expect(sanitizeText("abcdef", 3)).toBe("abc");
  });

  it("keeps ordinary unicode text intact", () => {
    expect(sanitizeText("Camisa de algodón · talla M")).toBe(
      "Camisa de algodón · talla M",
    );
  });
});

describe("sanitizeMultiline", () => {
  it("preserves newlines but strips other control characters", () => {
    expect(sanitizeMultiline("line1\nline2\u0007")).toBe("line1\nline2");
  });

  it("removes angle brackets and caps length", () => {
    expect(sanitizeMultiline("<p>hola</p>", 4)).toBe("phol");
  });
});

describe("sanitizeDigits", () => {
  it("keeps only digits up to the limit", () => {
    expect(sanitizeDigits("+52 (999) 638-4026", 10)).toBe("5299963840");
  });

  it("returns an empty string when there are no digits", () => {
    expect(sanitizeDigits("abc", 10)).toBe("");
  });
});
