import Link from "next/link";
import type { Product } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/lib/format";
import { imageUrl } from "@/lib/imageUrl";

const conditionLabels: Record<Product["condition"], string> = {
  "Como nuevo": "Como nuevo",
  Excelente: "Excelente",
  "Buen estado": "Buen estado",
};

function Thumbnail({ product }: Readonly<{ product: Product }>) {
  const [firstImage] = product.images;
  if (!firstImage) {
    return (
      <div
        aria-hidden="true"
        className="h-12 w-12 rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)]"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- backend-hosted image; CSP img-src allows the backend origin
    <img
      src={imageUrl(firstImage)}
      alt={`Miniatura de ${product.name}`}
      width={48}
      height={48}
      className="h-12 w-12 rounded-md border border-[var(--color-line)] object-cover"
      loading="lazy"
    />
  );
}

export function ProductsTable({
  products,
}: Readonly<{ products: Product[] }>) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">Lista de productos</caption>
      <thead>
        <tr className="border-b border-[var(--color-line)] text-[var(--color-muted)]">
          <th scope="col" className="py-3 pr-4 font-medium">
            <span className="sr-only">Miniatura</span>
          </th>
          <th scope="col" className="py-3 pr-4 font-medium">
            Nombre
          </th>
          <th scope="col" className="py-3 pr-4 font-medium">
            Precio
          </th>
          <th scope="col" className="py-3 pr-4 font-medium">
            Talla
          </th>
          <th scope="col" className="py-3 pr-4 font-medium">
            Condición
          </th>
          <th scope="col" className="py-3 font-medium">
            Estado
          </th>
          <th scope="col" className="py-3 font-medium">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr
            key={product.id}
            className="border-b border-[var(--color-line)] align-middle transition hover:bg-[var(--color-canvas)]"
          >
            <td className="py-3 pr-4">
              <Thumbnail product={product} />
            </td>
            <td className="py-3 pr-4 font-medium text-[var(--color-ink)]">
              <Link
                href={`/productos/${product.id}`}
                className="hover:text-[var(--color-accent)] hover:underline"
              >
                {product.name}
              </Link>
            </td>
            <td className="py-3 pr-4 text-[var(--color-price)]">
              {formatPrice(product.price)}
            </td>
            <td className="py-3 pr-4">{product.size}</td>
            <td className="py-3 pr-4">{conditionLabels[product.condition]}</td>
            <td className="py-3">
              <StatusBadge status={product.status} />
            </td>
            <td className="py-3 text-right">
              <Link
                href={`/productos/${product.id}/editar`}
                className="text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                Editar
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
