import type { AdminProductRequest, ProductCondition } from "@/types";

// Pure validation of a product form against the backend's AdminProductRequest
// contract. Returns field-keyed error messages (Spanish) so the form can show
// them inline; an empty object means valid.

export const PRODUCT_CONDITIONS: ProductCondition[] = [
  "Como nuevo",
  "Excelente",
  "Buen estado",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  size: string;
  condition: string;
  brand: string;
  color: string;
  measurements: string;
}

export type ProductFormErrors = Partial<
  Record<keyof ProductFormValues, string>
>;

function isCondition(value: string): value is ProductCondition {
  return (PRODUCT_CONDITIONS as string[]).includes(value);
}

export function parsePrice(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function validateProductForm(
  values: ProductFormValues,
): ProductFormErrors {
  const errors: ProductFormErrors = {};

  if (values.name.trim() === "") {
    errors.name = "El nombre es obligatorio.";
  }
  if (values.description.trim() === "") {
    errors.description = "La descripción es obligatoria.";
  }

  const price = parsePrice(values.price);
  if (price === null) {
    errors.price = "El precio es obligatorio.";
  } else if (price < 0) {
    errors.price = "El precio no puede ser negativo.";
  }

  if (!UUID_PATTERN.test(values.categoryId)) {
    errors.categoryId = "Selecciona una categoría.";
  }
  if (values.size.trim() === "") {
    errors.size = "La talla es obligatoria.";
  }
  if (!isCondition(values.condition)) {
    errors.condition = "Selecciona una condición.";
  }

  return errors;
}

// Maps validated form values to the backend request. Optional fields collapse
// empty strings to null, matching the nullable contract.
export function toProductRequest(
  values: ProductFormValues,
): AdminProductRequest {
  const optional = (value: string): string | null =>
    value.trim() === "" ? null : value.trim();

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    price: parsePrice(values.price) ?? 0,
    categoryId: values.categoryId,
    size: values.size.trim(),
    condition: values.condition as ProductCondition,
    brand: optional(values.brand),
    color: optional(values.color),
    measurements: optional(values.measurements),
  };
}
