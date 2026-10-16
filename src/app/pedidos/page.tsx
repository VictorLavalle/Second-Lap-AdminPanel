import { AdminHeader } from "@/components/AdminHeader";
import { OrdersView } from "@/components/OrdersView";

export default function PedidosPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold text-[var(--color-ink)]">
          Pedidos
        </h1>
        <OrdersView />
      </main>
    </div>
  );
}
