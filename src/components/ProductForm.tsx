"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Category, Product } from "@/types";
import { sanitizeMultiline, sanitizeText } from "@/lib/sanitize";
import {
  PRODUCT_CONDITIONS,
  toProductRequest,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/productForm";

const SUBMIT_ERROR = "No se pudo guardar el producto. Inténtalo de nuevo.";

function initialValues(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    categoryId: product?.categoryId ?? "",
    size: product?.size ?? "",
    condition: product?.condition ?? "",
    brand: product?.brand ?? "",
    color: product?.color ?? "",
    measurements: product?.measurements ?? "",
  };
}

export function ProductForm({
  categories,
  product,
}: Readonly<{ categories: Category[]; product?: Product }>) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(() =>
    initialValues(product),
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = product !== undefined;
  const endpoint = useMemo(
    () => (isEdit ? `/api/admin/products/${product.id}` : "/api/admin/products"),
    [isEdit, product],
  );

  function update<K extends keyof ProductFormValues>(
    key: K,
    value: string,
  ): void {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const validationErrors = validateProductForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toProductRequest(values)),
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        setSubmitError(SUBMIT_ERROR);
        return;
      }
      router.replace("/productos");
      router.refresh();
    } catch {
      setSubmitError(SUBMIT_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        id="name"
        label="Nombre"
        value={values.name}
        error={errors.name}
        onChange={(value) => update("name", sanitizeText(value, 120))}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="description"
          rows={4}
          value={values.description}
          aria-invalid={errors.description ? true : undefined}
          onChange={(event) =>
            update("description", sanitizeMultiline(event.target.value, 2000))
          }
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
        />
        <FieldError message={errors.description} />
      </div>

      <Field
        id="price"
        label="Precio (MXN)"
        value={values.price}
        error={errors.price}
        inputMode="numeric"
        onChange={(value) => update("price", value.replace(/[^0-9.]/g, ""))}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoryId" className="text-sm font-medium">
          Categoría
        </label>
        <select
          id="categoryId"
          value={values.categoryId}
          aria-invalid={errors.categoryId ? true : undefined}
          onChange={(event) => update("categoryId", event.target.value)}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
        >
          <option value="">Selecciona una categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.categoryId} />
      </div>

      <Field
        id="size"
        label="Talla"
        value={values.size}
        error={errors.size}
        onChange={(value) => update("size", sanitizeText(value, 40))}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="condition" className="text-sm font-medium">
          Condición
        </label>
        <select
          id="condition"
          value={values.condition}
          aria-invalid={errors.condition ? true : undefined}
          onChange={(event) => update("condition", event.target.value)}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
        >
          <option value="">Selecciona una condición</option>
          {PRODUCT_CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </select>
        <FieldError message={errors.condition} />
      </div>

      <Field
        id="brand"
        label="Marca (opcional)"
        value={values.brand}
        onChange={(value) => update("brand", sanitizeText(value, 80))}
      />
      <Field
        id="color"
        label="Color (opcional)"
        value={values.color}
        onChange={(value) => update("color", sanitizeText(value, 80))}
      />
      <Field
        id="measurements"
        label="Medidas (opcional)"
        value={values.measurements}
        onChange={(value) => update("measurements", sanitizeText(value, 200))}
      />

      {submitError ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {submitError}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:bg-[var(--color-accent-soft)] disabled:opacity-60"
        >
          {submitting ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => router.replace("/productos")}
          className="rounded-md border border-[var(--color-line)] px-4 py-2 font-medium hover:bg-[var(--color-canvas)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  inputMode,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  inputMode?: "numeric" | "text";
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
      />
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) {
    return null;
  }
  return <span className="text-xs text-[var(--color-danger)]">{message}</span>;
}
