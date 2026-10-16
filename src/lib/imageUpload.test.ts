import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  validateImage,
  validateImages,
} from "./imageUpload";

describe("validateImage", () => {
  it("accepts jpeg, png and webp within the size cap", () => {
    expect(validateImage({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateImage({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateImage({ type: "image/webp", size: 1000 })).toBeNull();
  });

  it("rejects unsupported types", () => {
    expect(validateImage({ type: "image/gif", size: 10 })).toMatch(
      /formato no permitido/i,
    );
  });

  it("rejects files above 5 MB", () => {
    expect(
      validateImage({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 }),
    ).toMatch(/5 MB/);
  });
});

describe("validateImages", () => {
  it("returns the first error in a batch", () => {
    expect(
      validateImages([
        { type: "image/png", size: 10 },
        { type: "application/pdf", size: 10 },
      ]),
    ).toMatch(/formato no permitido/i);
  });

  it("returns null when every file is valid", () => {
    expect(
      validateImages([
        { type: "image/png", size: 10 },
        { type: "image/webp", size: 20 },
      ]),
    ).toBeNull();
  });
});
