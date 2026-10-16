"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { useAdminResource } from "@/lib/useAdminResource";
import { formatPriceWithCents } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { imageUrl } from "@/lib/imageUrl";

function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando producto…</span>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="skeleton h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--color-line)] py-2 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-right text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

export function ProductDetailView({ productId }: Readonly<{ productId: string }>) {
  const { state } = useAdminResource<Product>(`/api/admin/products/${productId}`);

  if (state.status === "loading") {
    return <Loading />;
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-[var(--color-danger)]">
        {state.message}
      </p>
    );
  }

  const product = state.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">
            {product.name}
          </h2>
          <StatusBadge status={product.status} />
        </div>
        <Link
          href={`/productos/${product.id}/editar`}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-soft)]"
        >
          Editar
        </Link>
      </div>

      {product.images.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {product.images.map((image) => (
            <li key={image}>
              {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted image; CSP img-src allows the backend origin */}
              <img
                src={imageUrl(image)}
                alt={`Imagen de ${product.name}`}
                width={120}
                height={120}
                className="h-30 w-30 rounded-md border border-[var(--color-line)] object-cover"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          Este producto no tiene imágenes.
        </p>
      )}

      <section>
        <Row label="Precio" value={formatPriceWithCents(product.price)} />
        <Row label="Talla" value={product.size} />
        <Row label="Condición" value={product.condition} />
        {product.brand ? <Row label="Marca" value={product.brand} /> : null}
        {product.color ? <Row label="Color" value={product.color} /> : null}
        {product.measurements ? (
          <Row label="Medidas" value={product.measurements} />
        ) : null}
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
          Descripción
        </h3>
        <p className="whitespace-pre-line text-sm text-[var(--color-muted)]">
          {product.description}
        </p>
      </section>
    </div>
  );
}
