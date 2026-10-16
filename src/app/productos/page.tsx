import Link from "next/link";
import { AdminHeader } from "@/components/AdminHeader";
import { ProductsView } from "@/components/ProductsView";

export default function ProductosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">
            Productos
          </h1>
          <Link
            href="/productos/nuevo"
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-soft)]"
          >
            Nuevo producto
          </Link>
        </div>
        <ProductsView />
      </main>
    </div>
  );
}
