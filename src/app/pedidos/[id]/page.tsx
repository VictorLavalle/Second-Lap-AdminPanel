import Link from "next/link";
import { AdminHeader } from "@/components/AdminHeader";
import { OrderDetailView } from "@/components/OrderDetailView";

export default async function PedidoDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <Link
          href="/pedidos"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          ← Volver a pedidos
        </Link>
        <h1 className="mb-6 mt-2 text-xl font-semibold text-[var(--color-ink)]">
          Detalle del pedido
        </h1>
        <OrderDetailView orderId={id} />
      </main>
    </div>
  );
}
