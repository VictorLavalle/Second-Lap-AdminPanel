"use client";

import type { Category, Product } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { ProductForm } from "@/components/ProductForm";
import { ProductManagePanel } from "@/components/ProductManagePanel";

function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando formulario…</span>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="skeleton h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function LoadError({ message }: Readonly<{ message: string }>) {
  return (
    <p role="alert" className="text-[var(--color-danger)]">
      {message}
    </p>
  );
}

// Create mode: only categories are needed.
export function ProductCreateView() {
  const categories = useAdminResource<Category[]>("/api/admin/categories");

  if (categories.state.status === "loading") {
    return <Loading />;
  }
  if (categories.state.status === "error") {
    return <LoadError message={categories.state.message} />;
  }
  return <ProductForm categories={categories.state.data} />;
}

// Edit mode: load categories and the specific product.
export function ProductEditView({ productId }: Readonly<{ productId: string }>) {
  const categories = useAdminResource<Category[]>("/api/admin/categories");
  const product = useAdminResource<Product>(
    `/api/admin/products/${productId}`,
  );

  if (
    categories.state.status === "loading" ||
    product.state.status === "loading"
  ) {
    return <Loading />;
  }
  if (categories.state.status === "error") {
    return <LoadError message={categories.state.message} />;
  }
  if (product.state.status === "error") {
    return <LoadError message={product.state.message} />;
  }
  return (
    <div className="flex flex-col gap-8">
      <ProductForm
        categories={categories.state.data}
        product={product.state.data}
      />
      <ProductManagePanel product={product.state.data} />
    </div>
  );
}
