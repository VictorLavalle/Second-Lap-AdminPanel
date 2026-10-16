import { describe, expect, it } from "vitest";
import {
  parsePrice,
  toProductRequest,
  validateProductForm,
  type ProductFormValues,
} from "./productForm";

function validValues(
  overrides: Partial<ProductFormValues> = {},
): ProductFormValues {
  return {
    name: "Camisa de lino",
    description: "Prenda única",
    price: "450",
    categoryId: "11111111-1111-1111-1111-111111111111",
    size: "M",
    condition: "Excelente",
    brand: "",
    color: "",
    measurements: "",
    ...overrides,
  };
}

describe("parsePrice", () => {
  it("parses numeric strings and rejects non-numbers/empty", () => {
    expect(parsePrice("450")).toBe(450);
    expect(parsePrice("  10.5 ")).toBe(10.5);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
  });
});

describe("validateProductForm", () => {
  it("accepts a fully valid form", () => {
    expect(validateProductForm(validValues())).toEqual({});
  });

  it("flags required fields when blank", () => {
    const errors = validateProductForm(
      validValues({
        name: "  ",
        description: "",
        size: "",
        price: "",
        condition: "",
        categoryId: "",
      }),
    );

    expect(errors.name).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.size).toBeDefined();
    expect(errors.price).toBeDefined();
    expect(errors.condition).toBeDefined();
    expect(errors.categoryId).toBeDefined();
  });

  it("rejects a negative price", () => {
    expect(validateProductForm(validValues({ price: "-1" })).price).toBeDefined();
  });

  it("rejects a non-UUID category", () => {
    expect(
      validateProductForm(validValues({ categoryId: "not-a-uuid" })).categoryId,
    ).toBeDefined();
  });

  it("rejects a condition outside the enum", () => {
    expect(
      validateProductForm(validValues({ condition: "Nuevo" })).condition,
    ).toBeDefined();
  });
});

describe("toProductRequest", () => {
  it("trims required fields and collapses empty optionals to null", () => {
    const request = toProductRequest(
      validValues({ name: "  Camisa  ", brand: "", color: "Azul" }),
    );

    expect(request.name).toBe("Camisa");
    expect(request.brand).toBeNull();
    expect(request.color).toBe("Azul");
    expect(request.price).toBe(450);
    expect(request.condition).toBe("Excelente");
  });
});
